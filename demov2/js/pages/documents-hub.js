/* global RM */
(function () {
	'use strict';

	document.addEventListener('DOMContentLoaded', function () {
		RM.Boot.init({
			activeModule: 'documents',
			activeNav: 'documents-hub',
			onReady: function () {
				if (RM.Permissions.isAuditor() || RM.Permissions.isLiaison()) {
					window.location.href = RM.Links.page('dashboard');
					return;
				}
				if (!RM.Permissions.canViewCaseDetail()) {
					window.location.href = 'client-search.html';
					return;
				}
				renderPage();
			}
		});
	});

	function renderPage() {
		var user = RM.Session.getCurrentUser();
		var clients = RM.Data.caseloadForUser(user);
		var main = document.getElementById('page-content');

		main.innerHTML =
			RM.Components.modulePageHeader('documents-hub') +
			'<div id="documents-client-list"></div>';

		var el = document.getElementById('documents-client-list');
		if (!clients.length) {
			el.innerHTML = RM.Components.emptyState('No active cases', 'New referrals will appear here when cases are opened.');
			return;
		}

		var rows = clients.map(function (c) {
			var docs = RM.DocumentRepository.findByClientId(c.id);
			return '<tr class="hub-row" data-client-id="' + RM.Components.escapeHtml(c.id) + '" role="button" tabindex="0">' +
				'<td>' + RM.Components.escapeHtml(c.name) + '</td>' +
				'<td>' + RM.Components.processStageBadge(c) + '</td>' +
				'<td>' + docs.length + '</td>' +
				'<td><a href="' + RM.Links.page('case-workspace', { clientId: c.id, tab: 'documents' }) +
				'" class="btn btn-sm btn-primary" onclick="event.stopPropagation()">Open vault</a></td></tr>';
		}).join('');

		el.innerHTML = RM.Components.tableResponsive(
			'<table class="data-table data-table-interactive"><thead><tr>' +
			'<th>Client</th><th>Process stage</th><th>Documents</th><th></th></tr></thead><tbody>' + rows + '</tbody></table>'
		);

		el.querySelectorAll('.hub-row').forEach(function (row) {
			function go() {
				window.location.href = RM.Links.page('case-workspace', {
					clientId: row.getAttribute('data-client-id'),
					tab: 'documents'
				});
			}
			row.addEventListener('click', go);
			row.addEventListener('keydown', function (e) {
				if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
			});
		});
	}
})();
