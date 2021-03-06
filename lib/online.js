var BitGoJS = require('bitgo')
var underscore = require('underscore')

module.exports = {
/* { config       : { env            : 'prod'   }
   , authenticate : { username       : '...'
                    , password       : '...'
                    , otp            : '...'
                    , otp2           : '...'
                    , accessToken    : '...'
                    }
   }
 */
  authenticate:
    function (options, callback) {
      var config = underscore.extend(options.config || { env: 'prod' },
                                     underscore.pick(options.authenticate, [ 'accessToken' ]))
      var bitgo = new BitGoJS.BitGo(config)

      options.bitgo = bitgo
      if (config.accessToken) return callback(null, options)

      bitgo.authenticate(options.authenticate, function (err) {
        if (err) return callback(err, options)

        if (!options.authenticate.otp2) return callback(null, options)

        bitgo.unlock({ otp: options.authenticate.otp2 }, function (err) {
          if (err) return callback(err, options)

          callback(null, options)
        })
      })
    },

/* { bitgo        :  ...
   , userKey      : { label          : '...'
                    , xpub           : '...'
                    , encryptedXprv  : '...'
                    }
   , backupKey    : { label          : '...'
                    , xpub           : '...'
                    }
   , label        : '...'
   }
 */
  createWallet:
    function (options, callback) {
      var bitgo = options.bitgo

      bitgo.keychains().add(underscore.pick(options.userKey, [ 'label', 'xpub', 'encryptedXprv' ]), function (err, keychain) {
        if (err) return callback(err, null, options)

        bitgo.keychains().add(underscore.pick(options.backupKey, [ 'label', 'xpub' ]),
        function (err, keychain) {
          if (err) return callback(err, null, options)

          bitgo.keychains().createBitGo({}, function (err, bitGoKey) {
            if (err) return callback(err, null, options)

            bitgo.wallets().add({
              label: options.label,
              m: 2,
              n: 3,
              enterprise: options.enterpriseId,
              keychains: [ { xpub: options.userKey.xpub }, { xpub: options.backupKey.xpub }, { xpub: bitGoKey.xpub } ]
            },
            function (err, result) {
              if (err) return callback(err, null, options)

              callback(null, result.wallet, options)
            })
          })
        })
      })
    },

/* { bitgo        :  ...
   , wallet       : { id             : '...'    }
   , recipients   : { 'address'      : satoshis }
   }
 */
  createTx:
    function (options, callback) {
      var bitgo = options.bitgo

      bitgo.estimateFee({ numBlocks: 6 }, function (err, estimate) {
        if (err) return callback(err, null, options)

        console.log('estimated fees: ' + JSON.stringify(estimate, null, 2))
        bitgo.wallets().get(options.wallet, function (err, wallet) {
          if (err) return callback(err, null, options)

          wallet.createTransaction({ recipients: options.recipients, feeTxConfirmTarget: 1 }, function (err, unsignedTx) {
            if (err) return callback(err, null, options)

            console.log('actual fee: ' + unsignedTx.fee)
            callback(null, unsignedTx, options)
          })
        })
      })
    },

/* { bitgo        :  ...
   , wallet       : { id             : '...'    }
   , transaction  : { tx             :  ...     }
   , message      : '...'
   }
 */
  submitTx:
    function (options, callback) {
      var bitgo = options.bitgo

      bitgo.wallets().get(options.wallet, function (err, wallet) {
        if (err) return callback(err, null, options)

        wallet.sendTransaction({ tx: options.transaction.tx, message: options.message }, function (err, result) {
          if (err) return callback(err, null, options)

          return callback(null, result, options)
        })
      })
    }
}
