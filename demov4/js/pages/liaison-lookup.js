/* global RM */
(function () {
	'use strict';

	document.addEventListener('DOMContentLoaded', function () {
		RM.Boot.init({
			activeModule: 'clients',
			activeNav: 'liaison-lookup',
			onReady: function () {
				if (RM.Permissions.isAuditor()) {
					window.location.href = 'reports.html';
					return;
				}
				if (!RM.Permissions.isLiaison()) {
					window.location.href = 'dashboard.html';
					return;
				}
				renderPage();
			}
		});
	});

	function renderPage() {
		var main = document.getElementById('page-content');
		main.innerHTML =
			RM.Components.modulePageHeader('liaison-lookup') +
			'<div class="card liaison-lookup-card">' +
			'<h2>Look up a caller</h2>' +
			'<div class="search-bar">' +
			'<label for="liaison-search" class="sr-only">Search by name or phone</label>' +
			'<input type="search" id="liaison-search" placeholder="Name or phone number…" aria-label="Search by name or phone">' +
			'<button type="button" id="liaison-search-btn" class="btn btn-primary">Search</button>' +
			'</div>' +
			'<div id="liaison-results"></div>' +
			'</div>';

		function doSearch() {
			var q = document.getElementById('liaison-search').value.trim();
			renderResults(q);
		}

		document.getElementById('liaison-search-btn').addEventListener('click', doSearch);
		document.getElementById('liaison-search').addEventListener('keydown', function (e) {
			if (e.key === 'Enter') { doSearch(); }
		});

		renderResults('');
	}

	function renderResults(query) {
		var el = document.getElementById('liaison-results');
		var rows = RM.CrossProgramFlagService.lookupContacts(query);

		if (!query) {
			el.innerHTML = RM.Components.emptyState(
				'Enter a name or phone',
				'Results will list the assigned case manager when an active case is found.'
			);
			return;
		}

		if (!rows.length) {
			el.innerHTML = RM.Components.emptyState(
				'No active case found',
				'No open case management record matches this search. You may proceed with your program\'s intake process.'
			);
			return;
		}

		el.innerHTML =
			'<p class="liaison-results-summary">' + rows.length + ' active case' +
			(rows.length === 1 ? '' : 's') + ' found — contact the assigned case manager below.</p>' +
			'<table class="data-table liaison-results-table" aria-label="Assigned case manager contacts">' +
			'<thead><tr>' +
			'<th>Client (match)</th>' +
			'<th>Program</th>' +
			'<th>Case manager</th>' +
			'<th>Status</th>' +
			'<th>Contact</th>' +
			'</tr></thead><tbody>' +
			rows.map(function (row) {
				var contactCell = row.contactPhone && row.contactPhone !== '—'
					? '<a href="tel:' + row.contactPhone.replace(/\D/g, '') + '">' +
						RM.Components.escapeHtml(row.contactPhone) + '</a>'
					: RM.Components.escapeHtml(row.contactPhone);
				return '<tr>' +
					'<td>' + RM.Components.escapeHtml(row.clientName) + '</td>' +
					'<td>' + RM.Components.escapeHtml(row.programLabel) + '</td>' +
					'<td>' + RM.Components.escapeHtml(row.caseManagerName) + '</td>' +
					'<td><span class="client-status-badge">' + RM.Components.escapeHtml(row.caseManagerStatus) + '</span></td>' +
					'<td>' + contactCell + '</td></tr>';
			}).join('') +
			'</tbody></table>';
	}
})();
