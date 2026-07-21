/* global RM */
(function () {
	'use strict';

	var RM = window.RM = window.RM || {};

	RM.Audit = {
		record: function (entityRef, action, reason) {
			var user = RM.Session.getCurrentUser();
			var entry = {
				id: 'aud-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
				entityRef: entityRef,
				action: action,
				actorId: user ? user.id : 'system',
				actorName: user ? RM.Permissions.formatRoleLabel(user.role) : 'System',
				timestamp: new Date().toISOString(),
				reason: reason || null
			};
			var list = RM.Store.get('audit:log') || [];
			list.push(entry);
			RM.Store.set('audit:log', list);
			return entry;
		},

		findByEntity: function (entityRef) {
			var list = RM.Store.get('audit:log') || [];
			return list.filter(function (e) { return e.entityRef === entityRef; });
		},

		findAll: function () {
			return RM.Store.get('audit:log') || [];
		},

		findForClient: function (clientId) {
			var refs = ['client:' + clientId];
			[
				RM.ServiceEnrollmentRepository,
				RM.CarePlanRepository,
				RM.CaseNoteRepository
			].forEach(function (repo) {
				if (!repo || !repo.findAllRecordsByClientId) { return; }
				repo.findAllRecordsByClientId(clientId).forEach(function (item) {
					var prefix = repo === RM.ServiceEnrollmentRepository ? 'enrollment:' :
						repo === RM.CarePlanRepository ? 'carePlan:' : 'caseNote:';
					refs.push(prefix + item.id);
				});
			});

			var labels = {
				void: 'Voided entry',
				bulk_enroll: 'Bulk enrollment',
				client_created: 'Client created',
				demo_reset: 'Demo reset',
				merge: 'Duplicate merged',
				document_upload: 'Document uploaded'
			};

			return this.findAll().filter(function (entry) {
				return refs.indexOf(entry.entityRef) !== -1;
			}).map(function (entry) {
				return Object.assign({}, entry, {
					actionLabel: labels[entry.action] || entry.action
				});
			}).sort(function (a, b) {
				return new Date(b.timestamp) - new Date(a.timestamp);
			});
		}
	};
})();
