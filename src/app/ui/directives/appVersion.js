import CONFIG from '../../config';

/* @ngInject */
function appVersion(releaseNotesModal) {
    const onClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        releaseNotesModal.activate({
            params: {
                close() {
                    releaseNotesModal.deactivate();
                }
            }
        });
    };
    return {
        replace: true,
        template: `<a data-prefix="v" href="${CONFIG.articleLink}" title="${
            CONFIG.date_version
        }" target="_blank" class="color-white nodecoration">v${CONFIG.app_version}</a>`,
        link(scope, element) {
            element.on('click', onClick);

            scope.$on('$destroy', () => {
                element.off('click', onClick);
            });
        }
    };
}
export default appVersion;
