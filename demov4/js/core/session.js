/* global RM */
(function () {
	'use strict';

	var RM = window.RM = window.RM || {};

	RM.Session = {
		getCurrentUser: function () {
			return RM.Store.getMeta('session');
		},

		setCurrentUser: function (user) {
			RM.Store.setMeta('session', user);
		},

		getActiveClientId: function () {
			return RM.Store.getMeta('activeClientId');
		},

		setActiveClientId: function (id) {
			RM.Store.setMeta('activeClientId', id);
		},

		getPendingCase: function () {
			return RM.Store.getMeta('pendingCase');
		},

		setPendingCase: function (ctx) {
			RM.Store.setMeta('pendingCase', ctx);
		},

		clearPendingCase: function () {
			RM.Store.setMeta('pendingCase', null);
		},

		signOut: function () {
			RM.Store.setMeta('session', null);
			RM.Store.setMeta('activeClientId', null);
			RM.Store.setMeta('pendingCase', null);
			if (RM.Navigate) {
				RM.Navigate.toSignIn();
			} else {
				window.location.href = 'index.src.html';
			}
		},

		isAuthenticated: function () {
			return !!this.getCurrentUser();
		},

		resetDemo: function () {
			if (!RM.Permissions.can('resetDemo')) {
				return false;
			}
			RM.Store.clearAll();
			RM.Seed.load();
			window.location.href = 'case-creation.html';
			return true;
		}
	};
})();
