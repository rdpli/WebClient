import { isHTML } from '../../../helpers/domHelper';

/* @ngInject */
function notification() {
    const CONFIG = {
        classNames: {
            warning: 'notification-warning',
            error: 'notification-alert',
            success: 'notification-success',
            info: 'notification-info'
        }
    };
    const STATE = {};

    this.typeClasses = (config = {}) => ({ ...CONFIG.classNames, ...config });
    this.duration = (value = 6000) => (CONFIG.duration = value);
    this.template = (value = '') => (CONFIG.template = value);

    this.$get = [
        'notify',
        '$cacheFactory',
        'sanitize',
        'gettextCatalog',
        'translator',
        (notify, $cacheFactory, sanitize, gettextCatalog, translator) => {
            const I18N = translator(() => ({
                UNDO: gettextCatalog.getString('Undo', null, 'Link in notification to undo an action')
            }));

            // LRU cache containing notification texts -> timestamp
            const cache = $cacheFactory('notifications', { number: 5 });

            const action = (type) => (input, options = {}) => {
                const message = input instanceof Error ? input.message : input;
                options.classes = `${options.classes || ''} ${CONFIG.classNames[type]}`.trim();
                options.onClickClose = true;

                const htmlInfo = isHTML(message);

                // If it is a html string, double check that it is actually wrapped in one element. Otherwise wrap it in a div.
                if (htmlInfo.isHtml && !options.messageTemplate) {
                    const content = sanitize.input(message);
                    options.messageTemplate = htmlInfo.isWrapped ? content : `<div>${content}.</div>`;
                }

                /**
                 * Check if this notification is already displayed. Useful because the app often makes multiple
                 * API calls and if they error out with e.g. force upgrade they could show up multiple times.
                 */
                if (cache.get(message) === true) {
                    return;
                }
                cache.put(message, true);

                const onClose = (...args) => {
                    options.onClose && options.onClose(...args);
                    cache.put(message, false);
                };

                if (type === 'error' && typeof options.duration === 'undefined') {
                    options.duration = 10000;
                }

                if (options.undo) {
                    const content = sanitize.input(message);
                    options.onClick = options.undo;
                    options.messageTemplate = `<div>${content}. <button class="alignbaseline nodecoration bold color-currentColor">${I18N.UNDO}</button></div>`;
                }

                notify({ message, ...options, onClose });
            };

            const config = {
                position: 'center',
                maximumOpen: 5,
                duration: 6000
            };

            CONFIG.template && (config.templateUrl = CONFIG.template);

            notify.config(config);

            return {
                disableClose() {
                    STATE.disableClose = true;
                },
                success: action('success'),
                error: action('error'),
                info: action('info'),
                warn: action('warning'),
                closeAll() {
                    if (STATE.disableClose) {
                        return;
                    }
                    // We need to empty our cache as well because the onClose is not called from `closeAll`.
                    cache.removeAll();
                    notify.closeAll();
                }
            };
        }
    ];
}
export default notification;
