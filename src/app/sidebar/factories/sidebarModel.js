import { MAILBOX_IDENTIFIERS } from '../../constants';

/* @ngInject */
function sidebarModel(tools, cacheCounters, gettextCatalog, dynamicStates, contactGroupModel) {
    const getStateConfig = () => {
        const defaultDrafts = dynamicStates.getDraftsState();
        const defaultSent = dynamicStates.getSentState();

        return {
            inbox: {
                state: 'secured.inbox',
                label: gettextCatalog.getString('Inbox', null, 'Title'),
                icon: 'inbox'
            },
            drafts: {
                state: defaultDrafts,
                states: ['secured.allDrafts', 'secured.drafts'],
                label: gettextCatalog.getString('Drafts', null, 'Title'),
                icon: 'drafts'
            },
            sent: {
                state: defaultSent,
                states: ['secured.allSent', 'secured.sent'],
                label: gettextCatalog.getString('Sent', null, 'Title'),
                icon: 'sent'
            },
            starred: {
                state: 'secured.starred',
                label: gettextCatalog.getString('Starred', null, 'Title'),
                icon: 'star'
            },
            archive: {
                state: 'secured.archive',
                label: gettextCatalog.getString('Archive', null, 'Title'),
                icon: 'archive'
            },
            spam: {
                state: 'secured.spam',
                label: gettextCatalog.getString('Spam', null, 'Title'),
                icon: 'spam'
            },
            trash: {
                state: 'secured.trash',
                label: gettextCatalog.getString('Trash', null, 'Title'),
                icon: 'trash'
            },
            allmail: {
                state: 'secured.allmail',
                label: gettextCatalog.getString('All Mail', null, 'Title'),
                icon: 'all-emails'
            }
        };
    };

    const getFolderID = (mailbox, id) => {
        return mailbox === 'label' ? id : MAILBOX_IDENTIFIERS[mailbox];
    };

    const getTotal = (mailbox, id) => {
        const type = tools.getTypeList(mailbox);
        const key = type === 'conversation' ? 'Conversation' : 'Message';
        return cacheCounters[`unread${key}`](id);
    };

    const renameMailbox = (mailbox) => {
        if (mailbox === 'sent') {
            return dynamicStates.getSentState('');
        }

        if (mailbox === 'drafts') {
            return dynamicStates.getDraftsState('');
        }

        return mailbox;
    };

    /**
     * Returns the number of unread messages in a location
     * @param mailbox {String} name indentifier for folder
     * @param id {Integer} labelID for a label
     * @return {String}
     */
    const unread = (mailbox, id) => {
        const mailboxConverted = renameMailbox(mailbox);
        // ==> Move to a model
        const count = getTotal(mailboxConverted, getFolderID(mailboxConverted, id));

        // TODO: THIS IS A BUG WHY IS THIS UNDEFINED!
        if (count === undefined || count <= 0) {
            return '';
        }

        return `(${count})`;
    };

    /**
     * Returns the number of members inside a contact group
     * @param {String}  ID id of the contact group
     * @return {String}
     */
    const totalMember = (ID) => {
        const count = contactGroupModel.getNumber(ID);
        return count <= 0 ? '' : `(${count})`;
    };

    return { unread, getStateConfig, totalMember };
}
export default sidebarModel;
