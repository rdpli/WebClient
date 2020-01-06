import _ from 'lodash';

import { ELEMENTS_PER_PAGE } from '../../constants';

/* @ngInject */
function paginator(dispatchers, $stateParams, paginationModel) {
    const CLASS_PAGINATOR_DISABLED = 'paginator-disabled-';

    /**
     * Generate a list of classNames based on the current state
     * @param  {$scope} scope  Current scope
     * @return {Function}
     */
    const buildClassNames = (scope) => {
        const className = [];
        const maxPageNumber = paginationModel.getMaxPage();

        if ((~~$stateParams.page || 1) === 1) {
            className.push(`${CLASS_PAGINATOR_DISABLED}previous`);
        }

        if (paginationModel.isMax() || scope.totalItems === 0) {
            className.push(`${CLASS_PAGINATOR_DISABLED}next`);
        }

        if (maxPageNumber === 0 || maxPageNumber === 1 || scope.totalItems === 0) {
            className.push(`${CLASS_PAGINATOR_DISABLED}main`);
        }

        return className.join(' ');
    };

    const buildPageList = (size = 1) => _.range(1, size + 1);

    /**
     * Build a list of page where we can go
     * @param  {Number} size Total of data displayable
     * @return {Array}
     */
    const buildPages = (size = ELEMENTS_PER_PAGE) => {
        const total = Math.ceil(size / ELEMENTS_PER_PAGE);
        const value = ~~$stateParams.page > total ? ~~$stateParams.page : total;
        return buildPageList(value);
    };

    /**
     * Switch to previous or next on click
     * @param  {String} key  Key name
     * @return {Function}      EventListener callback
     */
    const onAction = (key) => (e) => (e.preventDefault(), paginationModel[key]());

    return {
        restrict: 'E',
        replace: true,
        templateUrl: require('../../../templates/directives/paginator.tpl.html'),
        scope: {
            totalItems: '='
        },
        link(scope, el) {
            scope.page = ~~$stateParams.page || 1;

            scope.$applyAsync(() => {
                const { on, unsubscribe } = dispatchers();

                scope.pages = buildPageList(paginationModel.getMaxPage());
                const rawClassNames = el[0].className; // create a ghost as we need to update them later (onLoad)
                el[0].className += ` ${buildClassNames(scope)}`;

                const $next = el[0].querySelector('.paginator-btn-next');
                const $previous = el[0].querySelector('.paginator-btn-previous');
                const $dropdownBtn = el.find('.paginator-dropdown');
                const onNext = onAction('next');
                const onPrevious = onAction('previous');

                const onClickPage = ({ target }) => {
                    paginationModel.to({ page: +target.getAttribute('data-value') });
                };

                $next.addEventListener('click', onNext, false);
                $previous.addEventListener('click', onPrevious, false);
                $dropdownBtn.on('click', onClickPage);

                on('app.cacheCounters', (event, { type, data }) => {
                    if (type === 'refresh.currentState') {
                        scope.$applyAsync(() => {
                            scope.pages = buildPages(data.value);
                            el[0].className = `${rawClassNames} ${buildClassNames(scope)}`;
                        });
                    }
                });

                scope.$on('$destroy', () => {
                    $next.removeEventListener('click', onNext);
                    $previous.removeEventListener('click', onPrevious);
                    $dropdownBtn.off('click', onClickPage);
                    unsubscribe();
                });
            });
        }
    };
}
export default paginator;
