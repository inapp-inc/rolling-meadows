/* global RM */
(function () {
	'use strict';

	var PROGRAM_LABELS = {
		'prog-seniors-at-risk': 'Seniors-at-Risk',
		'prog-police-ss': 'Police Social Services'
	};

	function caseManagerContact(caseManagerId) {
		var cm = RM.UserRepository.findById(caseManagerId);
		if (!cm) {
			return {
				caseManagerName: 'Unassigned',
				caseManagerStatus: '—',
				contactPhone: '—'
			};
		}
		return {
			caseManagerName: cm.name || RM.Permissions.formatRoleLabel(cm.role),
			caseManagerStatus: cm.availability || cm.status || 'Active',
			contactPhone: cm.contactPhone || cm.phone || '—'
		};
	}

	function isActiveCase(client) {
		return client.status === 'active' || client.status === 'open';
	}

	RM.CrossProgramFlagService = {
		check: function (partial) {
			var matches = RM.ClientRepository.findDuplicates(partial);
			var activeCases = [];

			matches.forEach(function (match) {
				var client = match.client;
				if (isActiveCase(client)) {
					var contact = caseManagerContact(client.caseManagerId);
					activeCases.push({
						clientId: client.id,
						caseManagerName: contact.caseManagerName,
						caseManagerPhone: contact.contactPhone,
						programId: client.programId,
						score: match.score
					});
				}
			});

			return activeCases.length ? activeCases[0] : null;
		},

		lookupContacts: function (query) {
			if (!query || !String(query).trim()) { return []; }

			var clients = RM.ClientRepository.search(query.trim());
			var rows = [];

			clients.forEach(function (client) {
				if (!isActiveCase(client)) { return; }
				var contact = caseManagerContact(client.caseManagerId);
				rows.push({
					clientName: client.name,
					programLabel: PROGRAM_LABELS[client.programId] || client.programId,
					caseManagerName: contact.caseManagerName,
					caseManagerStatus: contact.caseManagerStatus,
					contactPhone: contact.contactPhone
				});
			});

			return rows.sort(function (a, b) {
				return a.clientName.localeCompare(b.clientName);
			});
		}
	};
})();
