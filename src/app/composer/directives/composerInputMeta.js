import _ from 'lodash';

import { uniqID } from '../../../helpers/string';

/* @ngInject */
function composerInputMeta(contactSelectorModel, dispatchers) {
    /**
     * Check if there is at least one invalid mail inside the list
     * @param  {Array}  options.ToList
     * @param  {Array}  options.CCList
     * @param  {Array}  options.BCCList
     * @return {Boolean}
     */
    const containsInvalid = ({ ToList = [], CCList = [], BCCList = [] }) =>
        _.some([...ToList, ...CCList, ...BCCList], { invalid: true });

    /**
     * Check if the message contains some recipients (valid)
     * @param  {$scope} scope
     * @return {Function}
     */
    const containsRecipient = (scope) => () => {
        const { ToList = [], CCList = [], BCCList = [] } = scope.message;
        const hasInvalid = containsInvalid(scope.message);
        return !hasInvalid && (ToList.length || CCList.length || BCCList.length);
    };

    /**
     * Check if there is an address different than To inside a message
     * @param  {Array}  options.CCList
     * @param  {Array}  options.BCCList
     * @return {Boolean}
     */
    const containsBCC = ({ CCList = [], BCCList = [] }) => CCList.length || BCCList.length;

    /**
     * Generate a uniq name identifier for the input
     * @param  {String} label
     * @return {String}
     */
    const getNameAutocomplete = (label) => {
        return `composerAutocomplete${label}${uniqID()}`;
    };

    return {
        replace: true,
        templateUrl: require('../../../templates/directives/composer/composerInputMeta.tpl.html'),
        compile(element, { label, key }) {
            const $label = element[0].querySelector('.composerInputMeta-label');
            const $input = element[0].querySelector('.composerInputMeta-autocomplete');
            const $recipients = element.find('.composer-input-recipient');
            if ($label) {
                $label.textContent = label;
            }

            // Bind the model to the autocomplete
            if ($input) {
                $input.setAttribute('data-name', getNameAutocomplete(label));
                $input.setAttribute('data-emails', `message.${key}`);
                $input.setAttribute('data-key', key);
            }

            if (key !== 'ToList') {
                $recipients.remove();
            }

            return (scope, el) => {
                const isCurrentMsg = () => scope.message.ID === scope.selected.ID;
                const { dispatcher, on, unsubscribe } = dispatchers(['autocompleteEmails']);
                const getInputName = () => $input.getAttribute('data-name');

                const $btn = el[0].querySelector('.composerInputMeta-overlay-button');

                scope.containsRecipient = containsRecipient(scope);
                scope.containsInvalid = containsInvalid;

                const onClick = (e) => {
                    const { target } = e;

                    if (target.classList.contains('composerInputMeta-trigger-button')) {
                        return scope.$applyAsync(() => {
                            scope.message.ccbcc = !scope.message.ccbcc;
                        });
                    }

                    // Allow the user to select the text inside the autocomplete box cf WebClient#41
                    if (target.classList.contains('autocompleteEmails-label')) {
                        return;
                    }

                    const action = target.getAttribute('data-action');

                    if (action === 'openModal') {
                        contactSelectorModel.openModal(scope.message, { key, name: getInputName() });
                        return;
                    }

                    scope.$applyAsync(() => {
                        scope.selected.autocompletesFocussed = true;

                        if (containsBCC(scope.selected)) {
                            scope.message.ccbcc = true;
                            scope.message.attachmentsToggle = true;
                        }
                        _rAF(() => el.find('input').focus());
                    });
                };

                const onClickBtn = (e) => {
                    e.stopPropagation(); // Prevent collision with the onCLick itself
                    if (isCurrentMsg()) {
                        scope.$applyAsync(() => {
                            scope.message.ccbcc = !scope.message.ccbcc;
                            scope.message.attachmentsToggle = false;
                            scope.message.autocompletesFocussed = true;
                            _rAF(() => {
                                scope.$applyAsync(() => {
                                    el[0].querySelector('[name="autocomplete"]').click();
                                });
                            });
                        });
                    }
                };

                $btn.addEventListener('click', onClickBtn, false);
                el.on('click', onClick);

                on('composer.update', (event, { type, data = {} }) => {
                    if (
                        type === 'add.recipients' &&
                        data.name === getInputName() &&
                        data.messageID === scope.message.ID
                    ) {
                        const list = _.map(data.recipients, ({ Name, Email: Address }) => ({ Name, Address }));
                        dispatcher.autocompleteEmails('refresh', { list, name: data.name, messageID: data.messageID });
                    }
                });

                scope.$on('$destroy', () => {
                    $btn.removeEventListener('click', onClickBtn, false);
                    el.off('click', onClick);
                    unsubscribe();
                });
            };
        }
    };
}
export default composerInputMeta;
