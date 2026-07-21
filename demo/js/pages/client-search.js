/* global RM */
(function () {
	'use strict';

	document.addEventListener('DOMContentLoaded', function () {
		RM.Boot.init({
			activeNav: 'clients',
			onReady: function () {
				if (RM.Permissions.isLiaison()) {
					window.location.href = 'liaison-lookup.html';
					return;
				}
				if (RM.Permissions.isAuditor()) {
					window.location.href = 'reports.html';
					return;
				}
				var user = RM.Session.getCurrentUser();
				var canDetail = RM.Permissions.canViewCaseDetail();
				var main = document.getElementById('page-content');

				main.innerHTML =
					RM.Components.pageHeader('Client Search', 'Find clients by name, phone, or address. Click a row to preview case details.') +
					(!canDetail ? RM.Components.alert('info', 'You may search for clients to check cross-program flags. Case details are not available for your role.') : '') +
					'<div class="search-bar">' +
					'<label for="search-input" class="sr-only">Search clients</label>' +
					'<input type="search" id="search-input" placeholder="Name, phone, or address…" aria-label="Search clients">' +
					'<button type="button" id="btn-search" class="btn btn-primary">Search</button>' +
					'</div>' +
					'<div id="cross-program-alert"></div>' +
					'<div id="search-results"></div>';

				function doSearch() {
					var q = document.getElementById('search-input').value.trim();
					var results = q ? RM.ClientRepository.search(q) : RM.Data.activeClients();
					renderResults(results, canDetail, user);
				}

				document.getElementById('btn-search').addEventListener('click', doSearch);
				document.getElementById('search-input').addEventListener('keydown', function (e) {
					if (e.key === 'Enter') { doSearch(); }
				});
				doSearch();
			}
		});
	});

	function renderResults(clients, canDetail, user) {
		var el = document.getElementById('search-results');
		var alertEl = document.getElementById('cross-program-alert');
		alertEl.innerHTML = '';

		if (!clients.length) {
			el.innerHTML = RM.Components.emptyState('No clients found', 'Try a different spelling or partial phone number.');
			return;
		}

		if (!canDetail && clients.length) {
			clients.forEach(function (c) {
				if (c.status === 'active' || c.status === 'open') {
					var cm = RM.UserRepository.findById(c.caseManagerId);
					alertEl.innerHTML += RM.Components.alert('warning',
						'An active case exists for ' + RM.Components.escapeHtml(c.name) +
						' — contact the assigned ' + RM.Components.escapeHtml(cm ? RM.Permissions.formatRoleLabel(cm.role) : 'case manager') +
						'. (No case details shown per confidentiality policy.)');
				}
			});
		}

		if (!canDetail) {
			el.innerHTML = '';
			return;
		}

		var rows = clients.map(function (c) {
			var dup = RM.DeduplicationService.check({ name: c.name, phone: c.phone }, c.id);
			var dupFlag = dup.length ? ' <span title="Has potential duplicates">⚠</span>' : '';
			return '<tr class="client-search-row" data-client-id="' + RM.Components.escapeHtml(c.id) + '" role="button" tabindex="0" aria-label="View case summary for ' + RM.Components.escapeHtml(c.name) + '">' +
				'<td>' + RM.Components.escapeHtml(c.name) + dupFlag + '</td>' +
				'<td>' + RM.Components.escapeHtml(c.phone) + '</td>' +
				'<td>' + RM.Components.escapeHtml(c.address) + '</td>' +
				'<td>' + RM.Components.escapeHtml(c.status) + '</td></tr>';
		}).join('');

		el.innerHTML = '<table class="data-table data-table-interactive"><thead><tr><th>Name</th><th>Phone</th><th>Address</th><th>Status</th></tr></thead><tbody>' + rows + '</tbody></table>';

		el.querySelectorAll('.client-search-row').forEach(function (row) {
			function activate() {
				var clientId = row.getAttribute('data-client-id');
				var client = RM.ClientRepository.findById(clientId);
				if (!client) { return; }
				el.querySelectorAll('.client-search-row').forEach(function (r) { r.classList.remove('active'); });
				row.classList.add('active');
				openClientDrawer(client);
			}
			row.addEventListener('click', activate);
			row.addEventListener('keydown', function (e) {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					activate();
				}
			});
		});
	}

	function openClientDrawer(client) {
		var table = document.querySelector('#search-results .data-table-interactive');
		RM.Components.openClientDrawer(client.name, client, {}, table, '.client-search-row');
	}
})();
