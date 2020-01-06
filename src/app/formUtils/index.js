import captcha from './directives/captcha';
import captchaView from './directives/captchaView';
import cardCvc from './directives/cardCvc';
import cardNumber from './directives/cardNumber';
import cardView from './directives/cardView';
import checkTypoEmails from './services/checkTypoEmails';
import compareTo from './directives/compareTo';
import cvcTooltip from './directives/cvcTooltip';
import danger from './directives/danger';
import formIsInvalid from './directives/formIsInvalid';
import password from './directives/password';
import uniqueUsername from './directives/uniqueUsername';
import validRecovery from './directives/validRecovery';
import validatorTypoEmail from './directives/validatorTypoEmail';
import cardModel from './factories/cardModel';
import countriesListModel from './factories/countriesListModel';
import humanVerificationModel from './factories/humanVerificationModel';
import validEmail from './directives/validEmail';
import isValidInvoiceText from './directives/isValidInvoiceText';
import codeVerificator from './directives/codeVerificator';

export default angular
    .module('proton.formUtils', ['ngIntlTelInput'])
    .directive('isValidInvoiceText', isValidInvoiceText)
    .directive('validEmail', validEmail)
    .directive('captcha', captcha)
    .directive('captchaView', captchaView)
    .directive('cardCvc', cardCvc)
    .directive('cardNumber', cardNumber)
    .directive('cardView', cardView)
    .directive('compareTo', compareTo)
    .directive('cvcTooltip', cvcTooltip)
    .directive('danger', danger)
    .directive('formIsInvalid', formIsInvalid)
    .directive('password', password)
    .directive('uniqueUsername', uniqueUsername)
    .directive('validRecovery', validRecovery)
    .directive('validatorTypoEmail', validatorTypoEmail)
    .directive('codeVerificator', codeVerificator)
    .factory('cardModel', cardModel)
    .factory('checkTypoEmails', checkTypoEmails)
    .factory('humanVerificationModel', humanVerificationModel)
    .factory('countriesListModel', countriesListModel).name;
