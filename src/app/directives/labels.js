angular.module("proton.labels", [])

.directive('dropdownLabels', function ($timeout, $q, Label) {
    function link(scope, element, attrs) {
        $('#open-label').click(function() {
            scope.open();
        });

        scope.open = function() {
            var messagesLabel = [];
            var messages = scope.getMessages();

            scope.alsoArchive = true;
            scope.labels = scope.getLabels();

            _.each(messages, function(message) {
                messagesLabel = messagesLabel.concat(_.map(message.LabelIDs, function(id) {
                    return id;
                }));
            });

            _.each(scope.labels, function(label) {
                var count = _.filter(messagesLabel, function(m) {
                    return m === label.ID;
                }).length;

                label.Selected = count > 0;
            });

            $timeout(function() {
                $('#searchLabels').focus();
            });
        };

        scope.save = function() {
            scope.saveLabels(scope.labels, scope.alsoArchive);
            scope.close();
        };

        scope.close = function() {
            $('[data-toggle="dropdown"]').parent().removeClass('open');
        };
    }

    return {
        restrict: 'E',
        templateUrl: 'templates/partials/dropdown.labels.tpl.html',
        link: link,
        replace: true,
        scope: {
            getLabels: '&labels',
            getMessages: '&messages',
            saveLabels: '=save'
        }
    };
});
