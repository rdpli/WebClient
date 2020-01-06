import _ from 'lodash';

/* @ngInject */
function contactSelectorModel(contactEmails, contactSelectorModal, dispatchers) {
    const { dispatcher } = dispatchers(['composer.update']);

    /**
     * Prepare list of recipients for contactSelectorForm
     * Separate contact list and unknown contacts in others
     * @param  {Object} message
     * @param  {String} key
     * @return {Object}
     */
    const load = (message = {}, key = 'ToList') => {
        const recipients = message[key] || [];
        const emailList = contactEmails.get().map((address) => ({ ...address }));
        const emailMap = emailList.reduce((acc, { Email = '' }, index) => {
            acc[Email] = index;
            return acc;
        }, Object.create(null));

        return _.reduce(
            recipients,
            (acc, { Name, Address: Email, invalid }) => {
                const index = emailMap[Email];

                if (typeof index !== 'undefined') {
                    acc.list[index].selected = true;
                    return acc;
                }

                if (!invalid) {
                    // Coming from autocompleteEmailsModel
                    acc.others.push({ Name, Email });
                }

                return acc;
            },
            { list: emailList, others: [] }
        );
    };

    const openModal = (message, { key, name }) => {
        const { list, others } = load(message, key);

        contactSelectorModal.activate({
            params: {
                list,
                others,
                submit(recipients) {
                    dispatcher['composer.update']('add.recipients', {
                        name,
                        recipients,
                        messageID: message.ID
                    });
                }
            }
        });
    };

    return { openModal };
}
export default contactSelectorModel;
