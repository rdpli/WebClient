import _ from 'lodash';

import { MAILBOX_IDENTIFIERS, ROW_MODE, COLUMN_MODE, CONVERSATION_VIEW_MODE } from '../../constants';

import { isReplied, isRepliedAll, isForwarded } from '../../../helpers/message';

/* @ngInject */
function ElementsController(
    $log,
    dispatchers,
    $scope,
    $state,
    $stateParams,
    actionConversation,
    AttachmentLoader,
    labelsModel,
    limitElementsModel,
    cache,
    embedded,
    firstLoadState,
    mailSettingsModel,
    paginationModel,
    AppModel,
    markedScroll,
    forgeRequestParameters,
    removeElement,
    cacheBase64,
    tools
) {
    const { on, unsubscribe, dispatcher } = dispatchers([
        'elements',
        'messageActions',
        'message.open',
        'requestElements'
    ]);
    let unbindWatcherElements;
    const MINUTE = 60 * 1000;
    const { NumMessagePerPage, MessageButtons } = mailSettingsModel.get();
    const id = setInterval(() => {
        dispatcher.elements('refresh.time');
    }, MINUTE);
    const updateNumberElementChecked = (value) => ($scope.numberElementChecked = value);

    const TYPE_ELEMENTS = tools.getTypeList();

    $scope.elementsLoaded = false;
    $scope.limitReached = false;
    $scope.conversations = [];

    function hasLabels({ LabelIDs = [], Labels = [] }) {
        return LabelIDs.length || Labels.length;
    }
    $scope.hasLabels = hasLabels;

    const getTestClassNames = (element) => {
        if (TYPE_ELEMENTS === 'message') {
            return {
                'element-is-replied': isReplied(element),
                'element-is-repliedall': isRepliedAll(element),
                'element-is-forwarded': isForwarded(element)
            };
        }
    };

    $scope.getClassNames = (element = {}, marked = {}) => {
        return {
            selected: element.Selected,
            active: active(element),
            marked: element.ID === marked.ID,
            hasLabels: hasLabels(element),
            read: isRead(element),
            hasAttachments: hasAttachments(element),
            expiring: element.ExpirationTime > 0,
            ...getTestClassNames(element)
        };
    };

    /**
     * Method called at the initialization of this controller
     */
    function initialization() {
        updateNumberElementChecked(AppModel.get('numberElementChecked'));
        $scope.markedElement = undefined;
        $scope.mailbox = tools.currentMailbox();
        $scope.conversationsPerPage = NumMessagePerPage;
        $scope.labels = labelsModel.get();
        $scope.messageButtons = MessageButtons;
        $scope.selectedFilter = $stateParams.filter;
        $scope.selectedOrder = $stateParams.sort || '-date';
        $scope.page = ~~$stateParams.page || 1;
        $scope.startWatchingEvent();
        $scope.refreshElements().then(() => {
            $scope.$applyAsync(() => {
                $scope.selectElements('all', false);
            }); // If we don't use the timeout, messages seems not available (to unselect for example)
            // I consider this trick like a bug in the angular application
        }, $log.error);
    }

    $scope.$on('$stateChangeSuccess', () => {
        $scope.elementsLoaded = false;
        $scope.limitReached = false;
    });

    function watchElements() {
        if (angular.isDefined(unbindWatcherElements)) {
            unbindWatcherElements();
        }

        unbindWatcherElements = $scope.$watch(
            'conversations',
            () => {
                AppModel.set('numberElementSelected', getElementsSelected().length);
            },
            true
        );
    }

    /**
     * Check if we should display the component
     * @param  {String} type
     * @return {Boolean}
     */
    const displayType = (type) => {
        let test = false;
        const { ViewLayout } = mailSettingsModel.get();
        const isColumnsMode = ViewLayout === COLUMN_MODE;
        const isRowsMode = ViewLayout === ROW_MODE;

        switch (type) {
            case 'rows': {
                test = !AppModel.is('mobile') && isRowsMode && !$scope.idDefined();
                break;
            }

            case 'columns': {
                test = isColumnsMode && !AppModel.is('mobile');
                break;
            }

            case 'placeholder': {
                const idDefined = $scope.idDefined();
                const shouldDisplay =
                    isColumnsMode && (!idDefined || (idDefined && AppModel.get('numberElementChecked') > 0));
                test = shouldDisplay && !AppModel.is('mobile');
                break;
            }

            case 'mobile': {
                test = !$scope.idDefined() && AppModel.is('mobile');
                break;
            }
        }

        return test;
    };

    $scope.displayType = displayType;

    /**
     * Check in LabelIDs and Labels to see if the conversation or message is starred
     * @param {Object} item
     */
    function isStarred({ LabelIDs = [], Labels = [] }) {
        if (Labels.length) {
            return _.some(Labels, { ID: MAILBOX_IDENTIFIERS.starred });
        }
        return LabelIDs.some((label) => label === MAILBOX_IDENTIFIERS.starred);
    }

    on('requestElements', (e, { type, data = {} }) => {
        if (type === 'get.selection') {
            $scope.$applyAsync(() => {
                dispatcher.requestElements('give.selection', getElementsSelected());
            });
        }
        if (type === 'saveLabels') {
            $scope.saveLabels(data.labels, data.alsoArchive);
        }
        if (type === 'moveTo') {
            $scope.move(data.mailbox, data.folderID);
        }
    });

    $scope.startWatchingEvent = () => {
        let isOpened = !!$state.params.id;

        /**
         * Auto detect if there is already a conversation:open, then do nothing
         * We need to give the focus to a conversation, not every conversations
         * @param  {Function} cb
         * @param  {Boolean} value  Default value to set
         * @return {Function}       EventListener
         */
        const onElement = (cb, value = true) => (...arg) => {
            if (!isOpened) {
                cb(...arg);

                if (tools.typeView() === 'conversation') {
                    isOpened = value;
                }
            }
        };

        on('elements', (e, { type, data = {} }) => {
            switch (type) {
                case 'mark': {
                    const thisElement = _.find($scope.conversations, { ID: data.id });

                    if (thisElement && $scope.markedElement !== thisElement) {
                        $scope.$applyAsync(() => {
                            $scope.markedElement = thisElement;
                        });
                    }
                    break;
                }
                case 'open':
                    $scope.$applyAsync(() => openElement(data.element));
                    break;
                case 'opened': {
                    const thisElement = _.find($scope.conversations, { ID: data.id });

                    if (thisElement) {
                        isOpened = true;
                    }
                    break;
                }
                case 'close':
                    isOpened = false;
                    break;
                case 'refresh':
                    $scope.refreshElements();
                    break;
                case 'switchTo.next':
                    newElement();
                    break;
                case 'switchTo.previous':
                    oldElement();
                    break;
            }
        });

        on(
            'openMarked',
            onElement(() => {
                openElement($scope.markedElement);
            })
        );

        on('left', () => {
            redirectUser();
            isOpened = false;
        });

        on(
            'right',
            onElement(() => {
                openElement($scope.markedElement);
            })
        );

        on('selectMark', () => {
            // Can be undefined when we switch to another state
            $scope.markedElement &&
                $scope.$applyAsync(() => {
                    $scope.markedElement.Selected = !$scope.markedElement.Selected;
                    AppModel.set('numberElementChecked', _.filter($scope.conversations, { Selected: true }).length);
                });
        });

        on('selectElements', (event, { type, data: { isChecked } }) => {
            $scope.$applyAsync(() => {
                $scope.selectElements(type, isChecked);
            });
        });

        on('app.commands', (e, { type, data }) => {
            const [, action, item] = type.match(/(add|remove)\.(folders|labels)$/) || [];
            $scope.$applyAsync(() => {
                item === 'labels' && $scope.saveLabels(data.list);
                item === 'folders' && $scope.move(null, data.ID, action);
            });
        });

        on('AppModel', (event, { type, data = {} }) => {
            if (type === 'numberElementChecked') {
                $scope.$applyAsync(() => {
                    updateNumberElementChecked(data.value);
                });
            }
        });

        on('applyLabels', (event, LabelID) => {
            $scope.applyLabels(LabelID);
        });

        on('hotkeys', (e, { type, data: { to } }) => {
            if (type === 'move') {
                const idDefined = $scope.idDefined();
                const isScope = !idDefined || (idDefined && AppModel.get('numberElementChecked') > 0);

                /**
                 * Move item only when nothing is opened
                 * and we have a selection
                 * -> Prevent x2 move with marked item by conversation component
                 *
                 * Hack: defer to prevent children to check an empty value...
                 * @todo  we need to KILL this controller and rfr
                 */
                if ((!isOpened && isScope) || (AppModel.get('numberElementChecked') > 0 && isOpened)) {
                    e.preventDefault();
                    _.defer(() => $scope.move(to));
                }
            }

            if (type === 'escape') {
                $scope.back();
            }
        });

        on('read', () => {
            $scope.read();
        });

        on('unread', () => {
            $scope.unread();
        });

        on('toggleStar', toggleStar);

        function toggleStar() {
            const type = getTypeSelected();

            const { unstar, star } = getElementsSelected().reduce(
                (acc, model) => {
                    const action = isStarred(model) ? 'unstar' : 'star';
                    acc[action].push(model.ID);
                    return acc;
                },
                { unstar: [], star: [] }
            );

            if (type === 'conversation') {
                unstar.length && actionConversation.unstar(unstar);
                star.length && actionConversation.star(star);
            }

            if (type === 'message') {
                unstar.length && dispatcher.messageActions('unstar', { ids: unstar });
                star.length && dispatcher.messageActions('star', { ids: star });
            }
        }

        const markPrevious = onElement(() => {
            if ($scope.conversations) {
                const index = $scope.conversations.indexOf($scope.markedElement);

                if (index > 0) {
                    $scope.$applyAsync(() => {
                        $scope.markedElement = $scope.conversations[index - 1];
                    });
                    return markedScroll.follow(true);
                }

                goToPage('previous');
            }
        }, false);

        const markNext = onElement(() => {
            if ($scope.conversations) {
                const index = $scope.conversations.indexOf($scope.markedElement);

                if (index < $scope.conversations.length - 1) {
                    $scope.$applyAsync(() => {
                        $scope.markedElement = $scope.conversations[index + 1];
                    });
                    return markedScroll.follow();
                }

                goToPage('next');
            }
        }, false);

        /**
         * Go to the next element (newer)
         */
        function newElement() {
            const elementID = $state.params.id;

            if (!elementID) {
                return markPrevious();
            }

            const { ViewLayout, ViewMode } = mailSettingsModel.get();
            const isRowMode = ViewLayout === ROW_MODE;
            const current = $state.$current.name;
            const elementTime = $scope.markedElement.Time;
            const conversationMode = ViewMode === CONVERSATION_VIEW_MODE;

            cache
                .more(elementID, elementTime, 'next')
                .then((element) => {
                    const id = conversationMode ? element.ConversationID || element.ID : element.ID;
                    $state.go(current, { id });
                    $scope.markedElement = element;
                    dispatcher.elements('switchTo.next.success', element);
                    !isRowMode && markedScroll.follow();
                })
                .catch((data) => {
                    dispatcher.elements('switchTo.next.error', data);
                });
        }

        /**
         * Go to the previous element (older)
         */
        function oldElement() {
            const elementID = $state.params.id;

            if (!elementID) {
                return markNext();
            }

            const { ViewLayout, ViewMode } = mailSettingsModel.get();
            const isRowMode = ViewLayout === ROW_MODE;
            const current = $state.$current.name;
            const elementTime = $scope.markedElement.Time;
            const conversationMode = ViewMode === CONVERSATION_VIEW_MODE;

            cache
                .more(elementID, elementTime, 'previous')
                .then((element) => {
                    const id = conversationMode ? element.ConversationID || element.ID : element.ID;
                    $state.go(current, { id });
                    $scope.markedElement = element;
                    dispatcher.elements('switchTo.previous.success', element);
                    !isRowMode && markedScroll.follow();
                })
                .catch((data) => {
                    dispatcher.elements('switchTo.previous.error', data);
                });
        }

        on('markPrevious', markPrevious);
        on('markNext', markNext);

        on('newElement', () => {
            newElement();
        });

        on('oldElement', () => {
            oldElement();
        });

        $scope.$on('$destroy', () => {
            unsubscribe();
            clearInterval(id);
            markedScroll.clear();
        });
    };

    $scope.refreshElements = () => {
        const request = forgeRequestParameters($scope.mailbox);
        const type = tools.getTypeList();

        const promise = type === 'message' ? cache.queryMessages(request) : cache.queryConversations(request);

        return promise.then(
            (elements) => {
                firstLoadState.set(false);
                const page = ~~$stateParams.page || 0;
                const selectedMap = $scope.conversations.reduce((map, element) => {
                    if (element.Selected) {
                        map[element.ID] = element;
                    }
                    return map;
                }, {});

                $scope.$applyAsync(() => {
                    const previousConversations = angular.copy($scope.conversations);

                    $scope.elementsLoaded = true;
                    $scope.conversations = elements.map((element) => {
                        element.Selected = typeof selectedMap[element.ID] !== 'undefined';
                        return element;
                    });

                    watchElements();
                    $scope.limitReached = limitElementsModel.isReached() && paginationModel.isMax();

                    /**
                     * Redirect the user if there are no elements to display for the current state
                     */
                    if (!$scope.conversations.length && page > 0 && !$scope.idDefined()) {
                        return $scope.back(false, page - 1);
                    }

                    if ($scope.conversations.length > 0) {
                        let element;

                        if (!$scope.markedElement) {
                            if ($state.params.id) {
                                element = _.find(
                                    $scope.conversations,
                                    ({ ID, ConversationID }) =>
                                        $state.params.id === ConversationID || $state.params.id === ID
                                );
                            } else {
                                element = _.head($scope.conversations);
                            }
                        } else {
                            const found = _.find($scope.conversations, { ID: $scope.markedElement.ID });

                            if (found) {
                                element = found;
                            } else {
                                const previousIndexMarked =
                                    _.findIndex(previousConversations, { ID: $scope.markedElement.ID }) || 0;
                                element = $scope.conversations[previousIndexMarked] || _.head($scope.conversations);
                            }
                        }

                        $scope.markedElement = element;
                    }
                });

                return elements;
            },
            () => {
                // If the request failed
                $scope.elementsLoaded = true;
                $scope.conversations = [];
            }
        );
    };

    /**
     * Return if the current element is active
     * @param {Object} element
     * @return {Boolean}
     */
    function active(element) {
        if (AppModel.get('numberElementChecked') === 0 && angular.isDefined($state.params.id)) {
            return $state.params.id === element.ConversationID || $state.params.id === element.ID;
        }

        return false;
    }

    function hasAttachments(element) {
        if (element.ConversationID) {
            // is a message
            return element.NumAttachments > 0;
        }
        // is a conversation
        return element.ContextNumAttachments > 0;
    }

    function isRead(element) {
        if (element.ConversationID) {
            // is a message
            return element.Unread === 0;
        }
        // is a conversation
        return element.ContextNumUnread === 0;
    }

    $scope.size = (element) => {
        if (element.ConversationID) {
            // is a message
            return element.Size;
        }
        // is a conversation
        return element.ContextSize;
    };

    $scope.isDisabled = () => {
        if ($scope.markedElement) {
            return false;
        }

        return AppModel.get('numberElementChecked') === 0 && !angular.isDefined($state.params.id);
    };

    $scope.isCacheContext = () => tools.cacheContext();

    /**
     * Select elements
     * @param {String} value - filter value
     * @param {Boolean} isChecked
     */
    $scope.selectElements = (value, isChecked) => {
        const actions = {
            all(element) {
                element.Selected = isChecked;
            },
            read(element) {
                element.Selected = (element.ContextNumUnread === 0 || element.Unread === 0) && isChecked;
            },
            unread(element) {
                element.Selected = (element.ContextNumUnread > 0 || element.Unread === 1) && isChecked;
            },
            starred(element) {
                element.Selected = isStarred(element) && isChecked;
            },
            unstarred(element) {
                element.Selected = !isStarred(element) && isChecked;
            }
        };

        _.each($scope.conversations, (element) => actions[value](element));

        AppModel.set('numberElementChecked', _.filter($scope.conversations, { Selected: true }).length);
    };

    /**
     * Return [Element] selected
     * @param {Boolean} includeMarked
     * @return {Array} elements
     */
    function getElementsSelected(includeMarked = true) {
        if ($state.params.id && mailSettingsModel.get('ViewLayout') === ROW_MODE) {
            const ID = $state.params.id;
            const messageMode = tools.typeView() === 'message';
            // We only test for the messageMode view as we will need the ConversationID
            return [messageMode ? cache.getMessageCached(ID) : cache.getConversationCached(ID)];
        }

        const { conversations = [] } = $scope; // conversations can contains message list or conversation list
        const elements = _.filter(conversations, { Selected: true });

        if (!elements.length && $scope.markedElement && includeMarked) {
            return _.filter(
                conversations,
                ({ ID, ConversationID }) => ID === $scope.markedElement.ID || ConversationID === $scope.markedElement.ID
            );
        }

        return elements;
    }

    /**
     * Return [IDs]
     * @return {Array}
     */
    function idsSelected() {
        return _.map(getElementsSelected(), 'ID');
    }

    /**
     * Get type of the elements selected
     * @return {String}
     */
    function getTypeSelected() {
        const [element] = getElementsSelected();
        if (element) {
            return element.ConversationID ? 'message' : 'conversation';
        }
        return tools.getTypeList();
    }

    /**
     * Mark conversations selected as read
     */
    $scope.read = () => {
        const type = getTypeSelected();
        const ids = idsSelected();

        if (type === 'conversation') {
            actionConversation.read(ids);
        } else if (type === 'message') {
            dispatcher.messageActions('read', { ids });
        }
    };

    /**
     * Mark conversations selected as unread
     */
    $scope.unread = () => {
        const type = getTypeSelected();
        const ids = idsSelected();

        if (type === 'conversation') {
            actionConversation.unread(ids);
        } else if (type === 'message') {
            dispatcher.messageActions('unread', { ids });
        }

        if (angular.isDefined($state.params.id)) {
            $scope.back(true);
        }
    };

    $scope.delete = () => {
        removeElement({ getElementsSelected, idsSelected, getTypeSelected });
    };

    function redirectUser() {
        // The default view for all conversations in not the state conversation but inbox
        const name = $state.$current.name;
        const route = name.replace('.element', '');
        // Return to the state and close message
        $state.go(route, { id: '' });
    }

    /**
     * Move conversation to an other location
     * @param {String} mailbox
     */
    $scope.move = (mailbox, folderID) => {
        const type = getTypeSelected();
        const ids = idsSelected();
        const labelID = folderID || MAILBOX_IDENTIFIERS[mailbox];

        if (ids.length === 0) {
            return;
        }

        AppModel.set('numberElementChecked', 0);

        if (type === 'conversation') {
            actionConversation.move(ids, labelID);
        } else if (type === 'message') {
            dispatcher.messageActions('move', { ids, labelID });
        }
    };

    $scope.getElements = () => getElementsSelected();

    /**
     * Complex method to apply labels on element selected
     * @param {Array} labels
     * @param {Boolean} alsoArchive
     * @return {Promise}
     */
    $scope.saveLabels = (labels, alsoArchive) => {
        const type = getTypeSelected();
        const ids = idsSelected();

        if (type === 'conversation') {
            actionConversation.label(ids, labels, alsoArchive);
        } else if (type === 'message') {
            const messages = getElementsSelected();

            dispatcher.messageActions('label', { messages, labels, alsoArchive });
        }
    };

    /**
     * Back to conversation / message list
     * Or to the previous page.
     * @param refresh Boolean refresh the current state without it's id if true
     */
    $scope.back = (refresh = false, page) => {
        const route = $state.$current.name.replace('.element', '');

        if (refresh) {
            const opt = _.extend({}, $stateParams, { id: null });
            return $state.go(route, opt);
        }

        const config = {
            id: null,
            label: $stateParams.label
        };

        // Only add the queryParam if page > 1 (default inbox === ?page=1), else it's useless
        if (~~$stateParams.page && typeof page !== 'undefined') {
            config.page = page || ~~$stateParams.page || 1;
        }

        $state.go(route, config);
    };

    /**
     * Close all label dropdown
     */
    $scope.closeLabels = () => {
        $('.pm_dropdown').removeClass('active');
    };

    $scope.displayPaginator = () => !$state.params.id || mailSettingsModel.get('ViewLayout') === COLUMN_MODE;

    /**
     * Emulate labels array for the drag and drop
     * @param {String} labelID
     */
    $scope.applyLabels = (labelID) => {
        const labels = [];

        _.each($scope.labels, (label) => {
            if (label.ID === labelID) {
                label.Selected = true;
            }

            labels.push(label);
        });

        $scope.saveLabels(labels, true);
    };

    /**
     * Switch to an other page
     * @param {Integer} page
     */
    function goToPage(type = 'to') {
        $stateParams.page && $scope.selectElements('all', false);
        $scope.page = ~~$stateParams.page || 1;
        paginationModel[type]();
    }

    /**
     * Go to label folder + reset parameters
     * @param {String} labelID
     */
    $scope.goToLabel = (labelID) => {
        const params = { page: undefined, filter: undefined, sort: undefined, label: labelID };

        $state.go('secured.label', params);
    };

    /**
     * open a specific element
     * @param {Object} element - conversation / message
     */
    function openElement(element) {
        // When we switch to another state it can be undefined
        if (!element) {
            return;
        }

        const params = {};
        const sameView = $state.params.id && $state.params.id === element.ConversationID;

        if (tools.typeView() === 'conversation' && tools.getTypeList() === 'message') {
            params.id = element.ConversationID;
            params.messageID = element.ID;
        } else {
            params.id = element.ID;
            params.messageID = null;
        }

        // Unselect all elements
        $scope.selectElements('all', false);

        // it's possible that the previous conversation or message
        // had embedded images, and as blob URLs never get deallocated automatically
        // we may trigger a deallocation process to avoid a memory leak.
        embedded.deallocator(element);

        // reset the attachment storage
        AttachmentLoader.flushCache();

        // Mark this element
        $scope.markedElement = element;

        if (sameView) {
            return dispatcher['message.open']('toggle', {
                message: element,
                action: 'openElement'
            });
        }
        const route = $state.$current.name.replace('.element', '');
        $state.go(route + '.element', params);
        cacheBase64.removeAll();
    }

    initialization();
}
export default ElementsController;
