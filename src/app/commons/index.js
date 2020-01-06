import appConfigBody from './directives/appConfigBody';
import appCopyright from './directives/appCopyright';
import copy from './directives/copy';
import AppModel from './factories/AppModel';
import pmModal from './factories/pmModal';
import tempStorage from './factories/tempStorage';
import address from './models/address';
import eo from './models/eo';
import events from './models/events';
import filter from './models/filter';
import incomingDefault from './models/incomingDefault';
import invite from './models/invite';
import key from './models/key';
import label from './models/label';
import payment from './models/payment';
import paymentCache from './models/paymentCache';
import reset from './models/reset';
import user from './models/user';
import notification from './providers/notification';
import url from './services/url';
import dispatchers from './services/dispatchers';
import errorReporter from './services/errorReporter';
import i18nLoader from './services/i18nLoader';
import networkActivityTracker from './services/networkActivityTracker';
import networkUtils from './services/networkUtils';
import authenticationStore from './services/authenticationStore';
import secureSessionStorage from './services/secureSessionStorage';
import eoStore from './services/eoStore';
import translateAttribute from './directives/translateAttribute';
import lazyInject from './directives/lazyInject';
import ptClipboard from './services/ptClipboard';
import translator from './services/translator';

export default angular
    .module('proton.commons', [])
    .factory('translator', translator)
    .factory('ptClipboard', ptClipboard)
    .directive('appConfigBody', appConfigBody)
    .directive('appCopyright', appCopyright)
    .directive('copy', copy)
    .factory('AppModel', AppModel)
    .factory('pmModal', pmModal)
    .factory('tempStorage', tempStorage)
    .factory('Address', address)
    .factory('Eo', eo)
    .factory('Events', events)
    .factory('Filter', filter)
    .factory('IncomingDefault', incomingDefault)
    .factory('Invite', invite)
    .factory('Key', key)
    .factory('Label', label)
    .factory('Payment', payment)
    .factory('PaymentCache', paymentCache)
    .factory('Reset', reset)
    .factory('User', user)
    .provider('notification', notification)
    .factory('url', url)
    .factory('dispatchers', dispatchers)
    .factory('errorReporter', errorReporter)
    .factory('i18nLoader', i18nLoader)
    .factory('networkActivityTracker', networkActivityTracker)
    .factory('networkUtils', networkUtils)
    .factory('secureSessionStorage', secureSessionStorage)
    .factory('authenticationStore', authenticationStore)
    .factory('eoStore', eoStore)
    .directive('placeholderTranslate', translateAttribute.placeholder)
    .directive('titleTranslate', translateAttribute.title)
    .directive('lazyInject', lazyInject)
    .directive('ptTooltipTranslate', translateAttribute.tooltip).name;
