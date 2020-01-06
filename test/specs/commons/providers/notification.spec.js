import _ from 'lodash';
import notificationService from '../../../../src/app/commons/providers/notification';
import translatorService from '../../../../src/app/commons/services/translator';
import { generateModuleName } from '../../../utils/helpers';

const tpl = require('../../../../src/templates/notifications/base.tpl.html');

const sanitize = () => ({
    input: (input) => input
});
const MODULE = generateModuleName();
const gettextCatalog = () => ({
    getString: _.identity
});

describe('notification service', () => {
    angular.module(MODULE, ['cgNotify', 'templates-app', 'ngSanitize'])
        .factory('gettextCatalog', gettextCatalog)
        .factory('translator', translatorService)
        .factory('sanitize', sanitize)
        .provider('notification', notificationService)
        .config((notificationProvider) => {
            notificationProvider.template(tpl);
        });

    beforeEach(angular.mock.module(MODULE));

    let notification;
    let dom;
    let scope;

    beforeEach(angular.mock.inject((_notification_, _$compile_, _$rootScope_) => {
        notification = _notification_;
        scope = _$rootScope_.$new();
        dom = _$compile_('<div></div>')(scope);
    }));

    const showNotification = (data, type = 'success') => {
        notification[type](data, { container: dom });
        scope.$digest();
    };

    it('should display text notification', () => {
        showNotification('hello');
        expect(dom[0].querySelector('span.ng-binding').innerText)
            .toBe('hello');
    });

    it('should display error notification', () => {
        showNotification('hello', 'error');
        expect(dom[0].querySelector('.notification-alert'))
            .toBeTruthy();
    });

    it('should display info notification', () => {
        showNotification('hello', 'info');
        expect(dom[0].querySelector('.notification-info'))
            .toBeTruthy();
    });

    it('should display wrapped html notification', () => {
        showNotification('<div>he<a>asd</a>llo.</div>');
        expect(dom[0].querySelector('div[ng-show="$messageTemplate"]').innerHTML)
            .toBe('<div class="ng-scope">he<a>asd</a>llo.</div>');
    });

    it('should display unwrapped html notification', () => {
        showNotification('he<a>sd</a>llo');
        expect(dom[0].querySelector('div[ng-show="$messageTemplate"]').innerHTML)
            .toEqual('<div class="ng-scope">he<a>sd</a>llo.</div>');
    });
});
