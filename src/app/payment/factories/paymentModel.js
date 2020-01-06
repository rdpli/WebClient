import { isInvalidCoupon } from '../../../helpers/paymentHelper';

/* @ngInject */
function paymentModel(
    eventManager,
    Payment,
    networkActivityTracker,
    gettextCatalog,
    notification,
    dispatchers,
    translator
) {
    let CACHE = {};

    const I18N = translator(() => ({
        COUPON_INVALID: gettextCatalog.getString('Invalid coupon code', null, 'Error'),
        GIFT_INVALID: gettextCatalog.getString('Invalid gift code', null, 'Error'),
        COUPON_SUCCESS: gettextCatalog.getString('Coupon code accepted', null, 'Coupon code request'),
        GIFT_SUCCESS: gettextCatalog.getString('Gift code accepted', null, 'Gift code request')
    }));

    const { on } = dispatchers();

    const get = (key) => CACHE[key];
    const set = (key, value) => (CACHE[key] = value);
    const clear = (key) => (key ? (CACHE[key] = null) : (CACHE = {}));

    const loadStatus = () => {
        return Payment.status()
            .then(({ data = {} }) => data)
            .then((data) => set('status', data));
    };

    const loadMethods = ({ subuser } = {}) => {
        if (subuser) {
            return Promise.resolve([]);
        }
        return Payment.methods()
            .then(({ data = {} }) => data.PaymentMethods)
            .then((data) => set('methods', data));
    };

    const load = (type, cb) => (refresh, data) => {
        refresh && clear(type);
        if (get(type)) {
            return Promise.resolve(get(type));
        }
        return cb(data);
    };

    const getStatus = load('status', loadStatus);
    const getMethods = load('methods', loadMethods);

    const canPay = async () => {
        const isAble = () => {
            const { Stripe, Paymentwall } = get('status') || {};
            return Stripe || Paymentwall;
        };

        if (!get('status')) {
            await networkActivityTracker.track(getStatus());
            return isAble();
        }

        return isAble();
    };

    function subscribe(config) {
        return Payment.subscribe(config).then(({ data = {} } = {}) => data);
    }

    function add(params, thing) {
        const promise = Payment.valid(params)
            .then((data) => {
                if (thing === 'coupon' && isInvalidCoupon(params.CouponCode, data)) {
                    throw new Error(I18N.COUPON_INVALID);
                }

                if (thing === 'gift' && !data.Gift) {
                    throw new Error(I18N.GIFT_INVALID);
                }

                return data;
            })
            .then((data) => {
                if (thing === 'coupon') {
                    notification.success(I18N.COUPON_SUCCESS);
                }

                if (thing === 'gift') {
                    notification.success(I18N.GIFT_SUCCESS);
                }

                return data;
            });

        networkActivityTracker.track(promise);

        return promise;
    }

    function useGiftCode(GiftCode) {
        const promise = Payment.validateCredit({ GiftCode })
            .then(() => Payment.credit({ GiftCode, Amount: 0 }))
            .then(() => eventManager.call());

        networkActivityTracker.track(promise);

        return promise;
    }

    on('payments', (e, { type }) => {
        if (/^(donation|topUp)\.request\.success/.test(type)) {
            loadMethods();
        }
    });

    on('logout', () => {
        clear();
    });

    return { getStatus, getMethods, get, canPay, subscribe, add, useGiftCode, clear };
}
export default paymentModel;
