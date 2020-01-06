import HeaderController from './controllers/header';
import SecuredController from './controllers/secured';
import SetupController from './controllers/setup';
import SignupController from './controllers/signup';
import SupportController from './controllers/support';
import hideUpgrade from './directives/hideUpgrade';
import placeholderProgress from './directives/placeholderProgress';
import bugModalView from './directives/bugModalView';
import asideSidebar from './directives/asideSidebar';
import newVersion from './directives/newVersion';
import formatResponseInterceptor from './interceptors/formatResponseInterceptor';
import serverTimeInterceptor from './interceptors/serverTimeInterceptor';
import alertModal from './factories/alertModal';
import bugModal from './factories/bugModal';
import releaseNotesModal from './factories/releaseNotesModal';
import confirmModal from './factories/confirmModal';
import downloadFile from './factories/downloadFile';
import exceptionHandler from './factories/exceptionHandler';
import feedbackModal from './factories/feedbackModal';
import hotkeyModal from './factories/hotkeyModal';
import humanVerificationModal from './factories/humanVerificationModal';
import reactivateModal from './factories/reactivateModal';
import recoveryCodeModal from './factories/recoveryCodeModal';
import supportModal from './factories/supportModal';
import switchPasswordModeModal from './factories/switchPasswordModeModal';
import twoFAIntroModal from './factories/twoFAIntroModal';
import versionInfoModel from './factories/versionInfoModel';
import welcomeModal from './factories/welcomeModal';
import windowModel from './factories/windowModel';
import SidebarController from './controllers/sidebar';
import confirm from './services/confirm';
import signupIframe from './directives/signupIframe';

export default angular
    .module('proton.core', ['proton.utils'])
    .run((paginationModel, cachePages) => {
        paginationModel.init();
        cachePages.init();
    })
    .controller('SidebarController', SidebarController)
    .controller('HeaderController', HeaderController)
    .controller('SecuredController', SecuredController)
    .controller('SetupController', SetupController)
    .controller('SignupController', SignupController)
    .controller('SupportController', SupportController)
    .directive('hideUpgrade', hideUpgrade)
    .directive('placeholderProgress', placeholderProgress)
    .directive('bugModalView', bugModalView)
    .directive('asideSidebar', asideSidebar)
    .directive('newVersion', newVersion)
    .directive('signupIframe', signupIframe)
    .factory('formatResponseInterceptor', formatResponseInterceptor)
    .factory('serverTimeInterceptor', serverTimeInterceptor)
    .factory('alertModal', alertModal)
    .factory('bugModal', bugModal)
    .factory('confirmModal', confirmModal)
    .factory('releaseNotesModal', releaseNotesModal)
    .factory('downloadFile', downloadFile)
    .factory('$exceptionHandler', exceptionHandler)
    .factory('feedbackModal', feedbackModal)
    .factory('hotkeyModal', hotkeyModal)
    .factory('humanVerificationModal', humanVerificationModal)
    .factory('reactivateModal', reactivateModal)
    .factory('recoveryCodeModal', recoveryCodeModal)
    .factory('supportModal', supportModal)
    .factory('switchPasswordModeModal', switchPasswordModeModal)
    .factory('twoFAIntroModal', twoFAIntroModal)
    .factory('versionInfoModel', versionInfoModel)
    .factory('welcomeModal', welcomeModal)
    .factory('windowModel', windowModel)
    .factory('confirm', confirm).name;
