import cardIcon from './directives/cardIcon';
import cardPanel from './directives/cardPanel';
import donateBtn from './directives/donateBtn';
import donation from './directives/donation';
import donateModal from './modals/donateModal';
import bitcoinDetails from './directives/bitcoinDetails';
import bitcoinQrcode from './directives/bitcoinQrcode';
import bitcoinView from './directives/bitcoinView';
import donationExternalSubmit from './directives/donationExternalSubmit';
import featuresList from './directives/featuresList';
import giftCodeBtn from './directives/giftCodeBtn';
import giftCodeInput from './directives/giftCodeInput';
import giftCodeValidator from './directives/giftCodeValidator';
import payInvoiceBtn from './directives/payInvoiceBtn';
import paymentForm from './directives/paymentForm';
import paypalView from './directives/paypalView';
import donateModel from './factories/donateModel';
import giftCodeModel from './factories/giftCodeModel';
import paymentBitcoinModel from './factories/paymentBitcoinModel';
import paymentModalModel from './factories/paymentModalModel';
import paymentModel from './factories/paymentModel';
import brick from './services/brick';
import paymentPlanOverview from './directives/paymentPlanOverview';
import paymentVerificationLogo from './directives/paymentVerificationLogo';
import paymentPlansFormator from './services/paymentPlansFormator';
import paymentUtils from './services/paymentUtils';
import cardModal from './modals/cardModal';
import customizeInvoiceModal from './modals/customizeInvoiceModal';
import payModal from './modals/payModal';
import paymentVerificationModal from './modals/paymentVerificationModal';
import paymentModal from './modals/paymentModal';

export default angular
    .module('proton.payment', [])
    .directive('cardIcon', cardIcon)
    .directive('donateBtn', donateBtn)
    .directive('cardPanel', cardPanel)
    .directive('donation', donation)
    .directive('donationExternalSubmit', donationExternalSubmit)
    .directive('bitcoinDetails', bitcoinDetails)
    .directive('bitcoinQrcode', bitcoinQrcode)
    .directive('featuresList', featuresList)
    .directive('bitcoinView', bitcoinView)
    .directive('giftCodeBtn', giftCodeBtn)
    .directive('giftCodeInput', giftCodeInput)
    .directive('giftCodeValidator', giftCodeValidator)
    .directive('payInvoiceBtn', payInvoiceBtn)
    .directive('paymentForm', paymentForm)
    .directive('paypalView', paypalView)
    .directive('paymentVerificationLogo', paymentVerificationLogo)
    .directive('paymentPlanOverview', paymentPlanOverview)
    .factory('donateModel', donateModel)
    .factory('giftCodeModel', giftCodeModel)
    .factory('paymentBitcoinModel', paymentBitcoinModel)
    .factory('paymentModalModel', paymentModalModel)
    .factory('paymentModel', paymentModel)
    .factory('brick', brick)
    .factory('paymentPlansFormator', paymentPlansFormator)
    .factory('paymentUtils', paymentUtils)
    .factory('cardModal', cardModal)
    .factory('customizeInvoiceModal', customizeInvoiceModal)
    .factory('payModal', payModal)
    .factory('donateModal', donateModal)
    .factory('paymentVerificationModal', paymentVerificationModal)
    .factory('paymentModal', paymentModal).name;
