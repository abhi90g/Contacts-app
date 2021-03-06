var app = angular.module('contact', [
    'ngResource',
    'infinite-scroll',
    'angularSpinner',
    'jcs-autoValidate',
    'angular-ladda',
    'mgcrea.ngStrap',
    'toaster',
    'ngAnimate',
    'ui.router'
]);

app.config(function ($stateProvider, $urlRouterProvider) {
    $stateProvider
        .state('list', {
            url: "/",
            views: {
                'main': {
                    templateUrl: 'templates/list.html',
                    controller: 'PersonListController'
                },
                'search': {
                    templateUrl: 'templates/searchform.html',
                    controller: 'PersonListController'
                }
            }
        })
        .state('edit', {
            url: "/edit/:email",
            views: {
                'main': {
                    templateUrl: 'templates/edit.html',
                    controller: 'PersonDetailController'
                }
            }
        })
        .state('create', {
            url: "/create",
            views: {
                'main': {
                    templateUrl: 'templates/edit.html',
                    controller: 'PersonCreateController'
                }
            }
        });

    $urlRouterProvider.otherwise('/');
});

app.config(function ($httpProvider, $resourceProvider, laddaProvider, $datepickerProvider) {
    $httpProvider.defaults.headers.common['Authorization'] = 'Token e82675a28290b400f006d50444e70f5f4bf740ff';
    $resourceProvider.defaults.stripTrailingSlashes = false;
    laddaProvider.setOption({
        style: 'expand-right'
    });
    angular.extend($datepickerProvider.defaults, {
        dateFormat: 'd/M/yyyy',
        autoClose: true
    })
});

app.factory('Contact', function ($resource) {
    return $resource('https://api.codecraft.tv/samples/v1/contact/:id/', {id: '@id'}, {
        update: {
            method: 'PUT'
        }
    });
});

app.directive('ccSpinner', function () {
    return {
        'restrict': 'AE',
        'templateUrl': 'templates/spinner.html',
        'scope': {
            'isLoading': '=',
            'message': '@'
        }
    }
});

app.directive('ccCard', function () {
    return {
        'restrict': 'AE',
        'templateUrl': 'templates/card.html',
        'scope': {
            'user': '=',
            'deleteUser': '&'
        },
        'controller': function ($scope, ContactService) {
            $scope.isDeleting = false;
            $scope.deleteUser = function () {
                console.log('delete executed');
                $scope.isDeleting = true;
                ContactService.removeContact($scope.user).then(function () {
                    $scope.isDeleting = false;
                })
            }
        }
    }
});

app.filter('defaultImage', function () {

    return function (input, param) {
        // console.log(input);
        // console.log(param);
        if (!input) {
            return param;
        }
        return input;
    }
});

app.controller('PersonDetailController', function ($scope, ContactService, $stateParams, $state) {

    $scope.mode = 'Edit';
    $scope.contacts = ContactService;
    $scope.contacts.selectedPerson = $scope.contacts.getPerson($stateParams.email);

    $scope.save = function () {
        $scope.contacts.updateContact($scope.contacts.selectedPerson).then(function () {
            $state.go('list');
        })
    }
    $scope.remove = function () {
        $scope.contacts.removeContact($scope.contacts.selectedPerson).then(function () {
            $state.go('list');
        })
    }
});

app.controller('PersonCreateController', function ($scope, $state, ContactService) {
    $scope.mode = 'Create';

    $scope.contacts = ContactService;

    $scope.save = function () {
        console.log('saving record');
        $scope.contacts.createContact($scope.contacts.selectedPerson)
            .then(function () {
                $state.go('list');
            })
    };
})

app.controller('PersonListController', function ($scope, ContactService, $modal) {

    $scope.search = "";
    $scope.order = "email";
    $scope.contacts = ContactService;

    $scope.loadMore = function () {
        $scope.contacts.loadMore();
    };

    // $scope.parentDeleteUser = function (user) {
    //     $scope.contacts.removeContact(user)
    // };
    //
    //
    // $scope.showCreateModal = function () {
    //     $scope.createModal = $modal({
    //         scope: $scope,
    //         template: 'templates/modal.create.tpl.html',
    //         show: true
    //     })
    // };


    // $scope.sensitiveSearch = function (person) {
    //     if ($scope.search) {
    //         return person.name.indexOf($scope.search) == 0 ||
    //             person.email.indexOf($scope.search) == 0;
    //     }
    //     return true;
    // };

});

app.service('ContactService', function (Contact, $q, toaster, $rootScope) {

    // Contact.get(function (data) {
    // console.log(data);
    // });

    var self = {
        'getPerson': function (email) {
            console.log(email);
            for (var i = 0; i < self.persons.length; i++) {
                var obj = self.persons[i];
                if (obj.email == email) {
                    return obj;
                }
            }
        },
        'page': 1,
        'hasMore': true,
        'isLoading': false,
        'isSaving': false,
        'isDeleting': false,
        'selectedPerson': null,
        'persons': [],
        'search': null,
        'ordering': 'name',
        'doSearch': function () {
            self.hasMore = true;
            self.page = 1;
            self.persons = [];
            self.loadContacts();
        },
        'doOrder': function () {
            self.hasMore = true;
            self.page = 1;
            self.persons = [];
            self.loadContacts();
        },
        'loadContacts': function () {
            if (self.hasMore && !self.isLoading) {
                self.isLoading = true;

                var param = {
                    'page': self.page,
                    'search': self.search,
                    'ordering': self.ordering
                };

                Contact.get(param, function (data) {
                    console.log(data);
                    angular.forEach(data.results, function (person) {
                        self.persons.push(new Contact(person));
                    });

                    if (!data.next) {
                        self.hasMore = false;
                    }
                    self.isLoading = false;

                });
            }
        },
        'loadMore': function () {
            if (self.hasMore && !self.isLoading) {
                self.page += 1;
                self.loadContacts();
            }
        },
        'updateContact': function (person) {
            var d = $q.defer();
            self.isSaving = true;
            person.$update().then(function () {
                self.isSaving = false;
                toaster.pop('success', 'Updated ' + person.name);
                d.resolve();
            });
            return d.promise;
        },
        'removeContact': function (person) {
            var d = $q.defer();
            self.isDeleting = true;
            person.$remove().then(function () {
                self.isDeleting = false;
                var index = self.persons.indexOf(person);
                self.persons.splice(index, 1);
                self.selectedPerson = null;
                toaster.pop('success', 'Deleted ' + person.name);
                d.resolve();
            });
            return d.promise;
        },
        'createContact': function (person) {
            var d = $q.defer();
            self.isSaving = true;
            Contact.save(person).$promise.then(function () {
                self.isSaving = false;
                self.selectedPerson = null;
                self.hasMore = true;
                self.page = 1;
                self.persons = [];
                self.loadContacts();
                toaster.pop('success', 'Created ' + person.name);
                d.resolve();
            });
            return d.promise;
        },
        'watchFilters': function () {
            $rootScope.$watch(function () {
                return self.search;
            }, function (newVal) {
                if (angular.isDefined(newVal)) {
                    self.doSearch();
                }
            });
            $rootScope.$watch(function () {
                return self.ordering;
            }, function (newVal) {
                if (angular.isDefined(newVal)) {
                    self.doOrder();
                }
            })
        }

    };


    self.loadContacts();
    self.watchFilters();
    return self;

});
