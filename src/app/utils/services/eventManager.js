import _ from 'lodash';
import { arrayToHexString, binaryStringToArray, encodeUtf8, unsafeMD5 } from 'pmcrypto';

import { CONVERSATION_VIEW_MODE, EVENTS_MS, MAILBOX_IDENTIFIERS, STATUS, LABEL_TYPE } from '../../constants';
import { API_CUSTOM_ERROR_CODES, EVENT_ERRORS } from '../../errors';
import { isImported } from '../../../helpers/message';

/* @ngInject */
function eventManager(
    $cookies,
    $injector,
    $state,
    $timeout,
    authentication,
    cachePages,
    desktopNotifications,
    dispatchers,
    Events,
    gettextCatalog,
    mailSettingsModel,
    notification,
    notify,
    userSettingsModel
) {
    const FIBONACCI = [1, 1, 2, 3, 5, 8];
    const { EVENTS_ID_INVALID } = API_CUSTOM_ERROR_CODES;
    const { inbox, allDrafts, drafts, allSent, sent, trash, spam, allmail, archive, starred } = MAILBOX_IDENTIFIERS;
    const { DELETE, CREATE, UPDATE } = STATUS;
    const { on, dispatcher } = dispatchers([
        'app.event',
        'contacts',
        'messages.counter',
        'resetContactEmails',
        'filter',
        'updateUser'
    ]);

    const dispatchAppEvent = (type, data = {}) => dispatcher['app.event'](type, data);

    const STATE = {
        retryIndex: 0,
        loopTime: 0
    };

    const setEventID = (id) => (STATE.ID = id);
    const getEventID = () => STATE.ID;

    on('logout', () => {
        setEventID(undefined);
        STATE.retryIndex = 0;
        STATE.loopTime = 0;
    });

    const manageActiveMessage = ({ Messages = [] }) =>
        Messages.length && dispatchAppEvent('activeMessages', { messages: _.map(Messages, 'Message') });

    const manageSubscription = ({ Subscription: subscription }) =>
        subscription && dispatchAppEvent('subscription.event', { subscription });

    const manageContacts = (events = []) => events.length && dispatcher.contacts('contactEvents', { events });

    function manageMailSettings(mailSettings) {
        if (angular.isDefined(mailSettings)) {
            mailSettingsModel.set('all', mailSettings);
        }
    }

    function manageUserSettings(userSettings) {
        if (angular.isDefined(userSettings)) {
            userSettingsModel.set('all', userSettings);
        }
    }

    function manageVpnSettings(vpnSettings) {
        if (angular.isDefined(vpnSettings)) {
            $injector.get('vpnSettingsModel').set('all', vpnSettings);
        }
    }

    function manageMessageCounts(counts) {
        if (angular.isDefined(counts)) {
            const labelIDs = [inbox, allDrafts, drafts, allSent, sent, trash, spam, allmail, archive, starred].concat(
                $injector.get('labelsModel').ids()
            );

            _.each(labelIDs, (labelID) => {
                const count = _.find(counts, { LabelID: labelID });

                if (angular.isDefined(count)) {
                    $injector.get('cacheCounters').updateMessage(count.LabelID, count.Total, count.Unread);
                } else {
                    $injector.get('cacheCounters').updateMessage(labelID, 0, 0);
                }
            });

            dispatcher['messages.counter']();
        }
    }

    function manageConversationCounts(counts) {
        if (angular.isDefined(counts)) {
            const labelIDs = [inbox, allDrafts, drafts, allSent, sent, trash, spam, allmail, archive, starred].concat(
                $injector.get('labelsModel').ids()
            );

            _.each(labelIDs, (labelID) => {
                const count = _.find(counts, { LabelID: labelID });

                if (angular.isDefined(count)) {
                    $injector.get('cacheCounters').updateConversation(count.LabelID, count.Total, count.Unread);
                } else {
                    $injector.get('cacheCounters').updateConversation(labelID, 0, 0);
                }
            });
        }
    }

    function manageThreadings(messages, conversations) {
        let events = [];

        if (angular.isArray(messages)) {
            events = events.concat(messages);
        }

        if (angular.isArray(conversations)) {
            events = events.concat(conversations);
        }

        if (events.length > 0) {
            $injector.get('cache').events(events, true);
        }
    }

    function manageDesktopNotifications(messages = []) {
        if (messages.length) {
            const { ViewMode } = mailSettingsModel.get();
            const threadingIsOn = ViewMode === CONVERSATION_VIEW_MODE;
            const { all } = $injector.get('labelsModel').get('map');
            const states = Object.keys(MAILBOX_IDENTIFIERS).reduce((acc, state) => {
                acc[MAILBOX_IDENTIFIERS[state]] = state;
                return acc;
            }, {});

            const filterNotify = ({ LabelIDs = [] }) => {
                return LabelIDs.map((ID) => all[ID] || {}).filter(({ Notify }) => Notify);
            };

            // @todo move them to the model itself
            // @todo rename constants to UPPERCASE
            all[inbox] = { Notify: 1, ID: inbox };
            all[starred] = { Notify: 1, ID: starred };

            _.each(messages, ({ Action, Message = {} }) => {
                const onlyNotify = filterNotify(Message);

                // Prevent desktop notification from being shown for imports
                if (isImported(Message)) {
                    return;
                }

                if (Action === 1 && Message.Unread === 1 && onlyNotify.length) {
                    const [{ ID }] = onlyNotify;
                    const route = `secured.${states[ID] || 'label'}.element`;
                    const label = states[ID] ? null : ID;
                    const title = gettextCatalog.getString(
                        'New mail from {{sender}}',
                        {
                            sender: Message.Sender.Name || Message.Sender.Address
                        },
                        'Notification user'
                    );

                    desktopNotifications.create(title, {
                        body: Message.Subject,
                        icon: '/assets/img/notification-badge.gif',
                        onClick() {
                            window.focus();

                            if (threadingIsOn) {
                                return $state.go(route, { id: Message.ConversationID, messageID: Message.ID, label });
                            }

                            $state.go(route, { id: Message.ID, label });
                        }
                    });
                }
            });
        }
    }

    function manageStorage(storage) {
        if (angular.isDefined(storage)) {
            authentication.user.UsedSpace = storage;
            dispatchAppEvent('usedSpace');
        }
    }

    function manageMembers(members = []) {
        members.length && dispatchAppEvent('members', members);
    }

    function manageDomains(domains = []) {
        domains.length && dispatchAppEvent('domains', domains);
    }

    function manageOrganization(organization) {
        organization && $injector.get('organizationModel').set(organization);
    }

    function manageFilters(filters) {
        if (angular.isArray(filters)) {
            _.each(filters, (filter) => {
                if (filter.Action === DELETE) {
                    dispatcher.filter('delete', { ID: filter.ID });
                } else if (filter.Action === CREATE || filter.Action === UPDATE) {
                    const simple = $injector.get('simpleFilter').computeFromTree(filter.Filter);
                    if (simple) {
                        filter.Filter.Simple = simple;
                    } else {
                        delete filter.Filter.Simple;
                    }
                    dispatcher.filter(filter.Action === CREATE ? 'create' : 'update', {
                        ID: filter.ID,
                        Filter: filter.Filter
                    });
                }
            });
        }
    }

    function manageNotices(notices) {
        if (!Array.isArray(notices) || notices.length === 0) {
            return;
        }

        // 2 week expiration
        const now = new Date();
        const expires = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 14);

        const onClose = (name) => $cookies.put(name, 'true', { expires });

        notices.forEach(async (message) => {
            const id = arrayToHexString(
                await unsafeMD5(binaryStringToArray(encodeUtf8(`${authentication.user.ID}${message}`)))
            );
            const cookieName = 'NOTICE-' + id;

            if ($cookies.get(cookieName)) {
                return;
            }

            notify({
                message,
                templateUrl: require('../../../templates/notifications/cross.tpl.html'),
                onClose: onClose(cookieName)
            });
        });
    }

    /**
     * Manage the addresses update for a user. Check early because addressesmodel.update will always re-set.
     * @param {Array} events
     * @returns {Promise}
     */
    function manageAddresses(events = []) {
        if (!events.length) {
            return Promise.resolve();
        }
        return $injector.get('addressesModel').update(events);
    }

    function refreshMail() {
        $injector.get('cache').reset();
        cachePages.clear();
        $injector.get('cacheCounters').reset();
        $injector.get('cache').callRefresh();
        $injector.get('cacheCounters').query();

        return authentication.fetchUserInfo().then(() => {
            dispatcher.updateUser();
            $injector.get('labelsModel').refresh();
        });
    }

    function refreshContact() {
        dispatcher.resetContactEmails();
        dispatcher.contacts('resetContacts');
    }

    const refreshLabels = ({ Labels = [] }) => {
        if (Labels.length) {
            const { messageLabels, contactGroups } = Labels.reduce(
                (acc, event) => {
                    // Label is not defined for delete event (Action: 0)
                    if (!event.Action || event.Label.Type === LABEL_TYPE.MESSAGE) {
                        acc.messageLabels.push(event);
                    }

                    if (!event.Action || event.Label.Type === LABEL_TYPE.CONTACT_GROUP) {
                        acc.contactGroups.push(event);
                    }

                    return acc;
                },
                {
                    messageLabels: [],
                    contactGroups: []
                }
            );

            messageLabels.length && $injector.get('labelsModel').sync(messageLabels);
            contactGroups.length && $injector.get('contactGroupModel').sync(contactGroups);
        }
    };

    const manage = async (data = {}) => {
        manageNotices(data.Notices);
        setEventID(data.EventID);

        if (data.Refresh) {
            data.Refresh & EVENT_ERRORS.MAIL && refreshMail();
            data.Refresh & EVENT_ERRORS.CONTACTS && refreshContact();
            return;
        }

        manageMailSettings(data.MailSettings);
        manageVpnSettings(data.VPNSettings);
        manageUserSettings(data.UserSettings);
        manageSubscription(data);
        refreshLabels(data);
        $injector.get('contactEmails').update(data.ContactEmails);
        manageContacts(data.Contacts);
        manageThreadings(data.Messages, data.Conversations);
        manageDesktopNotifications(data.Messages);
        manageMessageCounts(data.MessageCounts);
        manageConversationCounts(data.ConversationCounts);
        manageStorage(data.UsedSpace);
        manageDomains(data.Domains);
        manageMembers(data.Members);
        manageOrganization(data.Organization);
        manageFilters(data.Filters);
        manageActiveMessage(data);
        await manageAddresses(data.Addresses);
        await $injector.get('manageUser')(data);

        if (data.More === 1) {
            return loop(true);
        }
    };

    /**
     * Close the retry notification.
     */
    const closeRetryNotification = () => {
        if (!STATE.notification) {
            return;
        }
        STATE.notification.close();
        STATE.notification = undefined;
    };

    /**
     * Show the retry notification if it is not already shown.
     */
    const showRetryNotification = () => {
        if (STATE.notification) {
            return;
        }
        STATE.notification = notification.warn('', {
            templateUrl: require('../../../templates/notifications/retry.tpl.html'),
            onClick() {
                closeRetryNotification();
                loop();
            }
        });
    };

    /**
     * Start the event loop if it is not already started.
     */
    const start = () => {
        if (STATE.timeoutHandle) {
            return;
        }
        const ms = EVENTS_MS.INTERVAL_EVENT_TIMER * FIBONACCI[STATE.retryIndex];
        STATE.timeoutHandle = $timeout(loop, ms, false);
    };

    /**
     * Stop the event loop if it is started.
     */
    const stop = () => {
        if (!STATE.timeoutHandle) {
            return;
        }
        $timeout.cancel(STATE.timeoutHandle);
        STATE.timeoutHandle = undefined;
    };

    /**
     * Initialize the event manager.
     * If already has an event id, ignore the call and make sure it's started.
     * If trying to set an event id, set it and start.
     * Otherwise get the latest event id and start.
     * @param {String | Undefined} eventId
     * @return {Promise}
     */
    const initialize = async (eventId) => {
        if (getEventID()) {
            return start();
        }
        if (eventId) {
            setEventID(eventId);
            return start();
        }
        const latestEventId = await Events.getLatestID();
        setEventID(latestEventId);
        return start();
    };

    /**
     * Get the event. If an event id does not exist, get the latest event id first.
     * @returns {Promise}
     */
    const get = () => {
        const id = getEventID();

        // All the event calls ignores the general offline notification because we show a custom notification in the catch handler.
        const options = { noOfflineNotify: true };

        if (id) {
            return Events.get(id, options);
        }

        return Events.getLatestID(options).then(({ EventID: latestEventID } = {}) => {
            if (!latestEventID) {
                return;
            }
            setEventID(latestEventID);
            return Events.get(latestEventID, options);
        });
    };

    /**
     * Call the event manager, and if it succeeds, set up the loop to call it again after x seconds.
     * @param {Boolean} force Force the event call to happen, ignoring the debounce.
     * @returns {Promise}
     */
    function loop(force = false) {
        /*
         * If the interval call is already running AND the elapsed time since the previous pending call is greater than
         * the `loop debounce ms`. Return it.
         *
         * Imagine the following scenario:
         * A user has performed an action and we call the event manager directly. The event call takes 2 seconds to return.
         * In those 2 seconds, before the event call has returned, the user performs another action and we need new data
         * from the event log. In this case it falls through and recalls again.
         *
         * Otherwise, if the application wants to refresh inside the `loop debounce ms` (and we're not forcing a refresh),
         * we return the old call because we don't want to spam the event log either.
         */
        if (!force && STATE.loopCall && Date.now() - STATE.loopTime < EVENTS_MS.LOOP_DEBOUNCE_MS) {
            return STATE.loopCall;
        }

        stop();

        STATE.loopTime = Date.now();

        return (STATE.loopCall = get()
            .then((data) => {
                STATE.loopCall = undefined;
                STATE.loopTime = 0;

                // Close any retry notification.
                closeRetryNotification();

                stop();
                STATE.retryIndex = 0;
                start();

                return manage(data);
            })
            .catch((e) => {
                STATE.loopCall = undefined;
                STATE.loopTime = 0;

                stop();

                /**
                 * If the custom error code is invalid event id, null it and
                 * restart in 30 seconds (to prevent spamming) in case the FE
                 * is doing something wrong.
                 */
                const { data = {}, status } = e;
                if (data.Code === EVENTS_ID_INVALID) {
                    setEventID(undefined);
                    return start();
                }

                // Leaving the notification here for now pending discussion about the behavior.
                if (status === 0 || status === -1) {
                    showRetryNotification();
                }

                /**
                 * Error handling:
                 * 1) It could have failed because the network is offline, it will either restart from the resurrecter,
                 *    or the user hitting "retry now".
                 * 2) It could have failed because the API is down, so increase the retry index and start the timeout again.
                 */
                if (STATE.retryIndex < FIBONACCI.length - 1) {
                    STATE.retryIndex++;
                }
                start();

                throw e;
            }));
    }

    // Ensures that loop is never called with an argument because sometimes we chain eventManager.call.
    const call = () => loop();

    return { initialize, start, call, stop };
}

export default eventManager;
