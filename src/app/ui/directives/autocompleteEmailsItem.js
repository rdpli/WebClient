import _ from 'lodash';

import { EMAIL_FORMATING } from '../../constants';
import tooltipModel from '../../utils/helpers/tooltipHelper';

const { OPEN_TAG_AUTOCOMPLETE_RAW, CLOSE_TAG_AUTOCOMPLETE_RAW } = EMAIL_FORMATING;

/* @ngInject */
function autocompleteEmailsItem(
    sanitize,
    sendPreferences,
    autoPinPrimaryKeys,
    checkTypoEmails,
    keyCache,
    $compile,
    dispatchers,
    manageContactGroup,
    contactGroupModel
) {
    const toClass = (name) => `autocompleteEmails-${name}`;

    const TAB_KEY = 9;
    const KEY_ENTER = 13;
    const CLASSNAME = {
        BTN_REMOVE: toClass('btn-remove'),
        INVALID_EMAIL: toClass('item-invalid'),
        EDIT_EMAIL: toClass('item-edit')
    };

    /**
     * Change button [data-address] to delete the item
     * because we need it to match the address  inside the list
     * @param  {Node} node Component
     * @return {Function}     (address:String)
     */
    const buttonState = (node) => {
        const btn = node.querySelector('button');
        return (address) => btn.setAttribute('data-address', address);
    };

    /**
     * Extact and clean the new email
     * Format:
     *     - XXXX <xxx@xxxx.xxx>
     *     - xxx@xxxx.xxx
     * @param  {Node} target
     * @return {Object}        { name: String, adr:String }
     */
    const extractAddress = (target) => {
        const [name = '', adr = ''] = target.textContent
            .replace(CLOSE_TAG_AUTOCOMPLETE_RAW, '')
            .split(OPEN_TAG_AUTOCOMPLETE_RAW);
        return { name: name.trim(), adr: adr.trim() };
    };

    const getAddress = (target) => {
        const { name, adr } = extractAddress(target);
        return { Address: adr || name, Name: sanitize.input(name) };
    };

    const makeIconGroup = ({ Color }) =>
        `<icon data-name="contacts-groups" data-size="12" class="autocompleteEmailsItem-icon-group mr0-25 ml0-25 mtauto mbauto" style="fill:${Color}"></icon>`;

    function link(scope, el, { key }) {
        const { dispatcher, on, unsubscribe } = dispatchers(['recipient.update']);

        const $span = el.find('span');
        const $btn = el.find('.' + CLASSNAME.BTN_REMOVE);
        const updateBtn = buttonState(el[0]);
        let tooltip;

        if (scope.email.isContactGroup) {
            const group = contactGroupModel.read(scope.email.Address, 'labels');
            el.prepend($compile(makeIconGroup(group))(scope));
        }

        const onClick = ({ target }) => {
            if (scope.email.isContactGroup) {
                return manageContactGroup.editComposer(scope.email.Address, scope.message, key);
            }
            target.setAttribute('contenteditable', !scope.email.isContactGroup);
        };

        const onBlur = ({ target }) => {
            target.parentElement.classList.remove(CLASSNAME.EDIT_EMAIL);

            if (scope.email.isContactGroup) {
                return;
            }

            target.setAttribute('contenteditable', false);

            const { Address: oldAddress } = scope.email;
            const { Address, Name } = getAddress(target);
            updateBtn(Address);
            dispatcher['recipient.update']('update', {
                Address,
                Name,
                oldAddress,
                messageID: scope.message.ID,
                key
            });
        };

        let latestKey;

        /*
            Prevent event propagation for custom action by the main component.
            And reset invalid state
            ex: BACKSPACE
         */
        const onInput = _.throttle((e) => {
            latestKey = e.keyCode;

            if (!e.target.parentElement.classList.contains(CLASSNAME.EDIT_EMAIL)) {
                e.target.parentElement.classList.add(CLASSNAME.EDIT_EMAIL);
            }

            if (e.keyCode === KEY_ENTER) {
                return onBlur(e);
            }

            if (e.target.getAttribute('contenteditable') === 'true') {
                e.stopPropagation();
                /*
                    Don't update the scope itself, we need to remove the className by hand
                    Angular will trigger a reflow during the update and the user will lose the focus on the span.
                    cf #7958
                 */
                if (scope.email.invalid) {
                    e.target.parentElement.classList.remove(CLASSNAME.INVALID_EMAIL);
                }
            }
        }, 150);

        /**
         * Add tooltip on the element to display warnings coming from the API
         * The content can change
         */
        const updateTooltip = () => {
            const { warnings = [] } = scope.email; // warnings contains a list of messages

            if (!warnings.length) {
                tooltip && tooltip.hide();
                return;
            }

            const title = warnings.join(', ');

            if (!tooltip) {
                tooltip = tooltipModel(el, { title });
                return;
            }

            tooltip.updateTitleContent(title);
        };

        on('autocompleteEmails', (e, { type, data: { messageID } }) => {
            if (type === 'refresh' && messageID === scope.message.ID) {
                updateTooltip();
            }
        });

        on('tooltip', (e, { type }) => {
            if (type === 'hideAll' && tooltip) {
                tooltip && tooltip.hide();
            }
        });

        const onFocusBtn = ({ target, originalEvent = {} }) => {
            const { relatedTarget } = originalEvent;

            /*
                When we click on the button no relatedTarget
                If we focus via a tab we don't want to trigger a remove action
             */
            if (relatedTarget && latestKey !== TAB_KEY) {
                const { address } = target.dataset;
                dispatcher['recipient.update']('remove', {
                    messageID: scope.message.ID,
                    remove: {
                        address,
                        key
                    }
                });
            }
        };

        // keydown then input, usefull to keep the focus when we edit
        $span.on('keydown input', onInput);
        $btn.on('focus', onFocusBtn);
        $span.on('click', onClick);
        $span.on('blur', onBlur);

        scope.$on('$destroy', () => {
            $btn.off('focus', onFocusBtn);
            $span.off('keydown input', onInput);
            $span.off('click', onClick);
            $span.off('blur', onBlur);
            tooltip && tooltip.dispose();
            unsubscribe();
        });
    }

    return {
        replace: true,
        templateUrl: require('../../../templates/ui/autoCompleteEmailsItem.tpl.html'),
        compile(el, { key }) {
            const $btn = el[0].querySelector('.autocompleteEmails-btn-remove');
            $btn.setAttribute('data-key', key);
            return link;
        }
    };
}
export default autocompleteEmailsItem;
