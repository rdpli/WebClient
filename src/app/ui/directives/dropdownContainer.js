import { generateUID } from '../../../helpers/string';

/* @ngInject */
function dropdownContainer(dispatchers) {
    const CLASSNAMES = {
        left: 'dropDown--leftArrow',
        right: 'dropDown--rightArrow',
        leftBottom: 'dropDown--leftBottomArrow'
    };

    function link(scope, el, { position, mode }) {
        const id = generateUID();

        // Handle toolbar style by hand POST digest else compile will remove them
        if (mode === 'toolbar') {
            scope.$applyAsync(() => {
                // IE11 compat
                el[0].firstElementChild.classList.add('toolbar-button');
                el[0].firstElementChild.classList.add('toolbar-button--dropdown');
            });
        }

        position && el[0].classList.add(CLASSNAMES[position]);
        el[0].setAttribute('data-dropdown-id', id);

        const { dispatcher, on, unsubscribe } = dispatchers(['dropdownApp']);

        scope.$applyAsync(() => {
            let isLocked = false;
            const $btn = el[0].querySelector('.dropdownButton-container');
            const $content = el[0].querySelector('.dropdownContent-container');

            const toggle = (isOpen) => {
                $btn.setAttribute('aria-expanded', !isOpen);
                isOpen && $content.setAttribute('hidden', isOpen);
                !isOpen && $content.removeAttribute('hidden');
                dispatcher.dropdownApp('state', { isOpened: !isOpen, id });
            };

            function attachListener(remove) {
                if (remove) {
                    document.body.removeEventListener('click', onClick, false);
                    document.body.removeEventListener('keydown', onKeydown, false);
                    return;
                }

                document.body.addEventListener('click', onClick, false);
                document.body.addEventListener('keydown', onKeydown, false);
            }

            function onClick({ target }) {
                if (target !== el[0] && !el[0].contains(target) && !isLocked) {
                    toggle(true);
                    attachListener(true);
                }
            }

            function onKeydown({ code }) {
                if (code === 'Escape' && el[0].contains(document.activeElement)) {
                    toggle(true);
                    attachListener(true);
                }
            }

            const onClickButton = ({ target }) => {
                const isOpen = JSON.parse(target.getAttribute('aria-expanded') || false);
                toggle(isOpen);
                !isOpen && _rAF(() => attachListener(false));
                isOpen && _rAF(() => attachListener(true));

                // Force auto close all other dropdown
                dispatcher.dropdownApp('closeOthers', { id });
            };

            $btn.addEventListener('click', onClickButton);

            on('dropdownApp', (e, { type, data = {} }) => {
                if (type === 'closeOthers' && data.id !== id) {
                    toggle(true);
                }

                if (data.id !== id) {
                    return;
                }

                if (type === 'action') {
                    toggle(data.type === 'close');
                }

                if (type === 'lock') {
                    isLocked = data.value;
                }
            });

            scope.$on('$destroy', () => {
                attachListener(true);
                $btn.removeEventListener('click', onClickButton);
                unsubscribe();
            });
        });
    }

    return {
        scope: {},
        replace: true,
        restrict: 'E',
        transclude: true,
        templateUrl: require('../../../templates/ui/dropdownContainer.tpl.html'),
        link
    };
}
export default dropdownContainer;
