import _ from 'lodash';
import { flow, forEach, filter, reduce, sortBy, last, map } from 'lodash/fp';

import { MAILBOX_IDENTIFIERS } from '../../constants';
import { getConversationLabels } from '../helpers/conversationHelpers';
import { unicodeTag } from '../../../helpers/string';
import { getLabelIDsMoved } from '../../../helpers/message';

/* @ngInject */
function actionConversation(
    cache,
    canUndo,
    contactSpam,
    conversationApi,
    dispatchers,
    eventManager,
    gettextCatalog,
    networkActivityTracker,
    notification,
    tools,
    labelsModel
) {
    const { dispatcher } = dispatchers(['deleteConversation']);

    const basicFolders = [
        MAILBOX_IDENTIFIERS.inbox,
        MAILBOX_IDENTIFIERS.trash,
        MAILBOX_IDENTIFIERS.spam,
        MAILBOX_IDENTIFIERS.archive,
        MAILBOX_IDENTIFIERS.sent,
        MAILBOX_IDENTIFIERS.drafts
    ];

    function getFolderNameTranslated(labelID = '') {
        const { Name } = labelsModel.read(labelID, 'folders') || {};
        const mailboxes = {
            [MAILBOX_IDENTIFIERS.inbox]: gettextCatalog.getString('Inbox', null, 'App folder'),
            [MAILBOX_IDENTIFIERS.spam]: gettextCatalog.getString('Spam', null, 'App folder'),
            [MAILBOX_IDENTIFIERS.drafts]: gettextCatalog.getString('Drafts', null, 'App folder'),
            [MAILBOX_IDENTIFIERS.allDrafts]: gettextCatalog.getString('Drafts', null, 'App folder'),
            [MAILBOX_IDENTIFIERS.sent]: gettextCatalog.getString('Sent', null, 'App folder'),
            [MAILBOX_IDENTIFIERS.allSent]: gettextCatalog.getString('Sent', null, 'App folder'),
            [MAILBOX_IDENTIFIERS.trash]: gettextCatalog.getString('Trash', null, 'App folder'),
            [MAILBOX_IDENTIFIERS.archive]: gettextCatalog.getString('Archive', null, 'App folder')
        };
        return mailboxes[labelID] || Name;
    }

    /**
     * Delete a list of conversations
     * @param {ids}
     */
    function remove(ids = [], labelID) {
        const promise = conversationApi.delete(ids, labelID);
        cache.addToDispatcher(promise);

        if (!tools.cacheContext()) {
            promise.then(() => eventManager.call());
            return networkActivityTracker.track(promise);
        }

        const events = ids.reduce((acc, ID) => {
            const messages = cache.queryMessagesCached(ID);
            dispatcher.deleteConversation('delete', ID); // Close composer
            _.each(messages, ({ ID }) => acc.push({ Action: 0, ID }));
            acc.push({ Action: 0, ID });
            return acc;
        }, []);

        cache.events(events);
        return promise;
    }

    /**
     * Mark as unread a list of conversation
     * @param {Array} ids
     */
    function unread(ids = []) {
        const currentLocation = tools.currentLocation();
        const promise = conversationApi.unread(ids, currentLocation);
        cache.addToDispatcher(promise);

        if (!tools.cacheContext()) {
            promise.then(() => eventManager.call());
            networkActivityTracker.track(promise);
        }

        const events = ids.reduce((acc, ID) => {
            const messages = cache.queryMessagesCached(ID);
            const { Labels = [] } = cache.getConversationCached(ID) || {};

            if (messages.length) {
                const { ID } =
                    flow(
                        filter(({ LabelIDs = [] }) => _.includes(LabelIDs, currentLocation)),
                        sortBy(({ Time }) => Time),
                        last
                    )(messages) || {};

                ID &&
                    acc.push({
                        ID,
                        Action: 3,
                        Message: { ID, Unread: 1 }
                    });
            }

            acc.push({
                Action: 3,
                ID,
                Conversation: {
                    ID,
                    Labels: _.map(Labels, (label) => {
                        if (label.ID === currentLocation || label.ID === MAILBOX_IDENTIFIERS.allmail) {
                            label.ContextNumUnread++;
                        }
                        return label;
                    })
                }
            });
            return acc;
        }, []);

        cache.events(events);
    }

    /**
     * Mark as read a list of conversation
     * @param {Array} ids
     */
    function read(ids = []) {
        const currentLocation = tools.currentLocation();
        const promise = conversationApi.read(ids);

        cache.addToDispatcher(promise);

        if (!tools.cacheContext()) {
            promise.then(() => eventManager.call());
            networkActivityTracker.track(promise);
        }

        const events = ids.reduce((acc, ID) => {
            const { Labels = [] } = cache.getConversationCached(ID) || {};
            const messages = cache.queryMessagesCached(ID);

            if (messages.length) {
                flow(
                    filter(({ LabelIDs = [] }) => _.includes(LabelIDs, currentLocation)),
                    forEach(({ ID }) => {
                        acc.push({
                            ID,
                            Action: 3,
                            Message: { ID, Unread: 0 }
                        });
                    })
                )(messages);
            }

            acc.push({
                Action: 3,
                ID,
                Conversation: {
                    ID,
                    Labels: _.map(Labels, (label) => {
                        if (label.ID === currentLocation || label.ID === MAILBOX_IDENTIFIERS.allmail) {
                            label.ContextNumUnread = 0;
                        }
                        return label;
                    })
                }
            });
            return acc;
        }, []);

        cache.events(events);
    }

    /**
     * Unstar conversation
     * @param {Array} ids - conversation ids
     */
    function unstar(ids = []) {
        const promise = conversationApi.unstar(ids);
        const LabelIDsRemoved = [MAILBOX_IDENTIFIERS.starred];

        cache.addToDispatcher(promise);

        if (!tools.cacheContext()) {
            promise.then(() => eventManager.call());
            return networkActivityTracker.track(promise);
        }

        const events = flow(
            map((id) => cache.getConversationCached(id)),
            filter(Boolean),
            reduce((acc, { ID, ContextNumUnread, Labels }) => {
                const messages = cache.queryMessagesCached(ID);

                _.each(messages, (message) => {
                    acc.push({
                        Action: 3,
                        ID: message.ID,
                        Message: { ID: message.ID, Unread: message.Unread, LabelIDsRemoved }
                    });
                });

                acc.push({
                    Action: 3,
                    ID,
                    Conversation: {
                        ID,
                        ContextNumUnread,
                        Labels: getConversationLabels({ Labels, ContextNumUnread }, { toRemove: LabelIDsRemoved })
                    }
                });
                return acc;
            }, [])
        )(ids);

        cache.events(events);
    }

    /**
     * Star conversation
     * @param {Array} ids - conversation ids
     */
    function star(ids = []) {
        const promise = conversationApi.star(ids);
        const LabelIDsAdded = [MAILBOX_IDENTIFIERS.starred];
        cache.addToDispatcher(promise);

        if (!tools.cacheContext()) {
            promise.then(() => eventManager.call());
            return networkActivityTracker.track(promise);
        }

        const events = flow(
            map((id) => cache.getConversationCached(id)),
            filter(Boolean),
            reduce((acc, { ID, ContextNumUnread, Labels }) => {
                const messages = cache.queryMessagesCached(ID);

                _.each(messages, (message) => {
                    acc.push({
                        Action: 3,
                        ID: message.ID,
                        Message: { ID: message.ID, Unread: message.Unread, LabelIDsAdded }
                    });
                });

                acc.push({
                    Action: 3,
                    ID,
                    Conversation: {
                        ID,
                        ContextNumUnread,
                        Labels: getConversationLabels({ Labels, ContextNumUnread }, { toAdd: LabelIDsAdded })
                    }
                });
                return acc;
            }, [])
        )(ids);

        cache.events(events);
    }

    const getLabelsId = (list = [], cb = angular.noop) => {
        return (
            flow(
                filter(cb),
                map(({ ID }) => ID)
            )(list) || []
        );
    };

    const getRules = (element, labels = [], alsoArchive) => {
        const isMessage = element.ConversationID;
        const labelIDs = isMessage ? element.LabelIDs : element.Labels.map(({ ID }) => ID);
        const currentLocation = tools.currentLocation();
        const isStateAllowedRemove =
            _.includes(basicFolders, currentLocation) || labelsModel.contains(currentLocation, 'folders');
        // Selected can equals to true / false / null
        const LabelIDsAdded = getLabelsId(
            labels,
            ({ ID, Selected }) => Selected === true && (!isMessage || !labelIDs.includes(ID))
        );
        const LabelIDsRemoved = getLabelsId(
            labels,
            ({ ID, Selected }) => Selected === false && (!isMessage || labelIDs.includes(ID))
        );

        if (alsoArchive) {
            LabelIDsAdded.push(MAILBOX_IDENTIFIERS.archive);
            isStateAllowedRemove && LabelIDsRemoved.push(currentLocation);
        }

        return { LabelIDsAdded, LabelIDsRemoved };
    };

    /**
     * Apply labels on a list of conversations
     * @param {Array} ids list of conversation ID
     * @param {Array} labels
     * @param {Boolean} alsoArchive
     * @return {Promise}
     */
    function label(ids = [], labels = [], alsoArchive = false) {
        const REMOVE = 0;
        const ADD = 1;
        const process = (events) => {
            cache.events(events);
            // Send request to archive conversations
            alsoArchive && conversationApi.archive(ids);
        };

        const events = flow(
            map((id) => cache.getConversationCached(id)),
            filter(Boolean),
            reduce((acc, conversation) => {
                const { ID, ContextNumUnread, Labels } = conversation;
                const messages = cache.queryMessagesCached(ID);

                _.each(messages, (message) => {
                    const { LabelIDsAdded, LabelIDsRemoved } = getRules(message, labels, alsoArchive);

                    acc.push({
                        Action: 3,
                        ID: message.ID,
                        Message: {
                            ID: message.ID,
                            Unread: message.Unread,
                            LabelIDsAdded,
                            LabelIDsRemoved
                        }
                    });
                });

                const { LabelIDsAdded, LabelIDsRemoved } = getRules(conversation, labels, alsoArchive);

                acc.push({
                    Action: 3,
                    ID,
                    Conversation: {
                        ID,
                        ContextNumUnread,
                        toAdd: LabelIDsAdded, // Used by getPromises
                        toRemove: LabelIDsRemoved, // Used by getPromises
                        Labels: getConversationLabels(
                            { Labels, ContextNumUnread },
                            {
                                toAdd: LabelIDsAdded,
                                toRemove: LabelIDsRemoved
                            }
                        )
                    }
                });
                return acc;
            }, [])
        )(ids);

        const getPromises = (events, flag = ADD) => {
            const mapLabelIDs = events
                .filter(({ Conversation }) => Conversation)
                .reduce((acc, { Conversation }) => {
                    Conversation[flag === ADD ? 'toAdd' : 'toRemove'].forEach((labelID) => {
                        acc[labelID] = acc[labelID] || [];
                        acc[labelID].push(Conversation.ID);
                    });
                    return acc;
                }, {});

            return Object.keys(mapLabelIDs).map((labelID) => {
                return conversationApi[flag === ADD ? 'label' : 'unlabel'](labelID, mapLabelIDs[labelID]);
            });
        };

        const promise = Promise.all(getPromises(events), getPromises(events, REMOVE));

        cache.addToDispatcher(promise);

        if (tools.cacheContext()) {
            return process(events);
        }

        promise.then(() => process(events));
        networkActivityTracker.track(promise);

        return promise;
    }

    async function unlabel(ids = [], labels = []) {
        const promises = labels.map((id) => conversationApi.unlabel(id, ids));
        await networkActivityTracker.track(Promise.all(promises));
        await eventManager.call();
    }

    /**
     * Move conversation
     * @param {Array} conversationIDs
     * @param {String} labelID
     */
    function move(conversationIDs = [], labelID = '', undo = true) {
        const currentLocation = tools.currentLocation();
        const folders = labelsModel.ids('folders');
        const labels = labelsModel.ids('labels');
        const toTrash = labelID === MAILBOX_IDENTIFIERS.trash;
        const toSpam = labelID === MAILBOX_IDENTIFIERS.spam;
        const promise = conversationApi.label(labelID, conversationIDs);
        const folderName = getFolderNameTranslated(labelID);
        const notifyParameters = {};

        const successMessage = gettextCatalog.getPlural(
            conversationIDs.length,
            '1 conversation moved to {{folder}}',
            '{{number}} conversations moved to {{folder}}',
            {
                folder: unicodeTag(folderName),
                number: conversationIDs.length
            },
            'Info'
        );

        if (undo && canUndo()) {
            notifyParameters.undo = () => {
                move(conversationIDs, currentLocation, false);
            };
        }

        const displaySuccess = () => {
            notification.success(successMessage, notifyParameters);
        };

        const folderIDs = basicFolders.concat(folders).concat(toSpam || toTrash ? labels : []);

        cache.addToDispatcher(promise);

        if (!tools.cacheContext()) {
            promise.then(() => eventManager.call()).then(() => displaySuccess());
            return networkActivityTracker.track(promise);
        }

        // Generate cache events
        const { events, toSpamList } = _.reduce(
            conversationIDs,
            (acc, ID) => {
                const messages = cache.queryMessagesCached(ID);

                _.each(messages, (message) => {
                    const { LabelIDs = [], ID, Unread } = message;
                    const copyLabelIDsAdded = getLabelIDsMoved(message, labelID);
                    const copyLabelIDsRemoved = _.filter(LabelIDs, (labelID) => _.includes(folderIDs, labelID));

                    acc.events.push({
                        ID,
                        Action: 3,
                        Message: {
                            ID,
                            Unread: toTrash ? 0 : Unread,
                            LabelIDsRemoved: copyLabelIDsRemoved, // Remove current location
                            LabelIDsAdded: copyLabelIDsAdded // Add new location
                        }
                    });
                });

                const conversation = cache.getConversationCached(ID);

                if (conversation) {
                    if (toSpam) {
                        const { Senders = [] } = conversation;
                        acc.toSpamList.push(...Senders);
                    }

                    const Labels = conversation.Labels.reduce(
                        (acc, label) => {
                            if (_.includes(folderIDs, label.ID)) {
                                return acc;
                            }

                            label.ContextNumUnread = toTrash ? 0 : label.ContextNumUnread;
                            acc.push(label);

                            return acc;
                        },
                        [
                            {
                                ID: labelID,
                                ContextNumUnread: toTrash ? 0 : conversation.ContextNumUnread
                            }
                        ]
                    );

                    acc.events.push({
                        Action: 3,
                        ID,
                        Conversation: {
                            ID,
                            Selected: false,
                            Labels
                        }
                    });
                }

                return acc;
            },
            {
                events: [],
                toSpamList: []
            }
        );

        // Create a list of unique Address we send to spam
        const { list: spamEmails } = toSpamList.reduce(
            (acc, { Address = '' }) => {
                if (Address && !acc.map[Address]) {
                    acc.list.push(Address);
                    acc.map[Address] = true;
                }
                return acc;
            },
            { list: [], map: Object.create(null) }
        );

        spamEmails.length && contactSpam(spamEmails);
        cache.events(events);
        displaySuccess();
    }

    return { remove, unread, read, unstar, star, label, move, unlabel };
}
export default actionConversation;
