/* global RM */
(function () {
	'use strict';

	function pairKey(idA, idB) {
		return [idA, idB].sort().join('::');
	}

	function isPairDismissed(idA, idB) {
		var dismissed = RM.Store.getMeta('dismissedDuplicatePairs') || [];
		return dismissed.indexOf(pairKey(idA, idB)) !== -1;
	}

	function pendingDuplicateCount() {
		var clients = RM.ClientRepository.findAll();
		var count = 0;

		clients.forEach(function (c, i) {
			clients.slice(i + 1).forEach(function (c2) {
				if (isPairDismissed(c.id, c2.id)) { return; }
				var matches = RM.DeduplicationService.check({ name: c.name, phone: c.phone, dob: c.dob }, null);
				var found = matches.find(function (m) { return m.client.id === c2.id && m.score >= 25; });
				if (found) { count += 1; }
			});
		});

		return count;
	}

	RM.NotificationService = {
		getForUser: function (user) {
			if (!user || RM.Permissions.isAuditor() || RM.Permissions.isLiaison()) {
				return [];
			}

			var items = [];
			var overdue = RM.FollowUpCadenceService.getDueFollowUps(
				user.role === 'case_manager' ? user.id : null
			);

			overdue.slice(0, 3).forEach(function (d) {
				items.push({
					type: 'overdue',
					title: 'Overdue follow-up',
					body: d.client.name + ' — ' + d.daysOverdue + ' day' + (d.daysOverdue === 1 ? '' : 's') + ' overdue',
					href: RM.Links.page('case-workspace', { clientId: d.client.id, tab: 'followup' })
				});
			});

			var caseload = RM.Data.caseloadForUser(user);
			caseload.filter(function (c) { return c.incompleteIntake; }).slice(0, 2).forEach(function (c) {
				items.push({
					type: 'intake',
					title: 'Incomplete intake',
					body: c.name + ' — consent or DOB missing',
					href: RM.Links.page('case-workspace', { clientId: c.id, tab: 'intake' })
				});
			});

			if (RM.Permissions.can('mergeDuplicates')) {
				var dupCount = pendingDuplicateCount();
				if (dupCount) {
					items.push({
						type: 'duplicate',
						title: 'Duplicate review',
						body: dupCount + ' potential duplicate pair' + (dupCount === 1 ? '' : 's') + ' pending merge',
						href: RM.Links.page('admin-duplicates')
					});
				}
			}

			return items.slice(0, 8);
		},

		countForUser: function (user) {
			return this.getForUser(user).length;
		}
	};
})();
