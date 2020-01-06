import { COLUMN_MODE, ROW_MODE } from '../../constants';

/* @ngInject */
function toogleModeElementsDropdown(
    dispatchers,
    networkActivityTracker,
    tools,
    settingsMailApi,
    notification,
    gettextCatalog,
    mailSettingsModel,
    markedScroll
) {
    const { dispatcher } = dispatchers(['settings']);
    const getLayout = (mode) => {
        const { ViewLayout } = mailSettingsModel.get();

        if (mode === 'rows' && ViewLayout === COLUMN_MODE) {
            return 1;
        }

        if (mode === 'columns' && ViewLayout === ROW_MODE) {
            return 0;
        }

        return ViewLayout;
    };

    const getLayoutRaw = (mode) => {
        if (mode === 'rows') {
            return ROW_MODE;
        }

        if (mode === 'col') {
            return COLUMN_MODE;
        }
    };

    const changeTo = async (mode, oldMode) => {
        const newLayout = getLayout(mode);
        const oldLayout = getLayoutRaw(oldMode);

        if (oldLayout === newLayout) {
            return oldLayout;
        }

        if (angular.isDefined(newLayout)) {
            const promise = settingsMailApi.updateViewLayout({ ViewLayout: newLayout }).then(() => {
                dispatcher.settings('viewLayout.updated', { viewLayout: newLayout });
                tools.mobileResponsive();
                markedScroll.clear();
                notification.success(gettextCatalog.getString('Layout saved', null, 'Info'));
            });

            await networkActivityTracker.track(promise);
        }

        return newLayout;
    };

    const setLayout = (value) => (value === COLUMN_MODE ? 'col' : 'rows');

    return {
        scope: {},
        replace: true,
        restrict: 'E',
        templateUrl: require('../../../templates/ui/toogleModeElementsDropdown.tpl.html'),
        link(scope, el) {
            const { ViewLayout } = mailSettingsModel.get();
            scope.layout = setLayout(ViewLayout);

            const onClick = async ({ target }) => {
                if (target.classList.contains('toogleModeElementsDropdown-btn-action')) {
                    const newLayout = await changeTo(target.getAttribute('data-action'), scope.layout);
                    scope.$applyAsync(() => {
                        scope.layout = setLayout(newLayout);
                    });
                }
            };

            el.on('click', onClick);

            scope.$on('$destroy', () => {
                el.off('click', onClick);
            });
        }
    };
}
export default toogleModeElementsDropdown;
