/* global RM */
(function () {
	'use strict';

	document.addEventListener('DOMContentLoaded', function () {
		RM.Boot.init({
			activeModule: 'clients',
			activeNav: 'client-search',
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
				renderSearchPage(user, canDetail, document.getElementById('page-content'));
			}
		});
	});

	function renderSearchPage(user, canDetail, main) {
		main.innerHTML =
			RM.Components.modulePageHeader('client-search') +
			'<div class="search-bar">' +
			'<label for="search-input" class="sr-only">Search clients</label>' +
			'<input type="search" id="search-input" placeholder="Name, phone, or address…" aria-label="Search clients">' +
			'<button type="button" id="btn-search" class="btn btn-primary">Search</button>' +
			'</div>' +
			'<div id="live-dedup"></div>' +
			'<div id="cross-program-alert"></div>' +
			'<div id="search-results"></div>';

		function doSearch() {
			var q = document.getElementById('search-input').value.trim();
			var results = q ? RM.ClientRepository.search(q) : RM.Data.activeClients();
			renderLiveDedup(q);
			renderResults(results, canDetail, user, q);
		}

		function scheduleSearch() {
			window.clearTimeout(searchTimer);
			searchTimer = window.setTimeout(doSearch, 200);
		}

		var searchTimer = null;

		document.getElementById('btn-search').addEventListener('click', doSearch);
		document.getElementById('search-input').addEventListener('input', scheduleSearch);
		document.getElementById('search-input').addEventListener('keydown', function (e) {
			if (e.key === 'Enter') {
				window.clearTimeout(searchTimer);
				doSearch();
			}
		});
		doSearch();
	}

	function renderLiveDedup(query) {
		var el = document.getElementById('live-dedup');
		if (!el) { return; }
		if (!query || query.length < 2) {
			el.innerHTML = '';
			return;
		}
		var partial = { name: query, phone: query, dob: '' };
		var matches = RM.DeduplicationService.check(partial, null);
		if (!matches.length) {
			el.innerHTML = '';
			return;
		}
		el.innerHTML = RM.Components.renderDedupMatches(matches, { linkClient: true });
		el.querySelectorAll('.dedup-open-link').forEach(function (link) {
			link.addEventListener('click', function (ev) {
				ev.preventDefault();
				var clientId = link.getAttribute('data-client-id');
				window.location.href = RM.Links.page('case-workspace', { clientId: clientId });
			});
		});
	}

	function matchBadgeForClient(client, query) {
		if (!query) { return ''; }
		var matches = RM.ClientRepository.findDuplicates({ name: query, phone: query, dob: '' });
		var match = matches.find(function (m) { return m.client.id === client.id; });
		return match ? RM.Components.matchConfidenceBadge(match.score) : '';
	}

	function renderResults(clients, canDetail, user, query) {
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
					var programLabel = c.caseCategoryId && RM.CaseCategories
						? RM.CaseCategories.categoryLabel(c.caseCategoryId)
						: RM.CrossProgramFlagService.programLabel(c.programId);
					alertEl.innerHTML += RM.Components.alertHtml('warning',
						'<strong>Cross-program flag</strong> — Active case in ' +
						RM.Components.escapeHtml(programLabel) + ' for ' + RM.Components.escapeHtml(c.name) +
						' — contact ' + RM.Components.escapeHtml(cm ? cm.name : 'assigned case manager') +
						'. Case details are not shown per confidentiality policy.');
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
				'<td>' + matchBadgeForClient(c, query) + '</td>' +
				'<td>' + RM.Components.caseCategoryBadge(c) + '</td>' +
				'<td>' + RM.Components.workflowStageBadge(c) + '</td>' +
				'<td>' + RM.Components.escapeHtml(c.phone) + '</td>' +
				'<td>' + RM.Components.escapeHtml(c.address) + '</td>' +
				'<td>' + RM.Components.escapeHtml(c.status) + '</td></tr>';
		}).join('');

		el.innerHTML = RM.Components.tableResponsive(
			'<table class="data-table data-table-interactive"><thead><tr><th>Name</th><th>Match</th><th>Category</th><th>Process stage</th><th>Phone</th><th>Address</th><th>Status</th></tr></thead><tbody>' + rows + '</tbody></table>'
		);

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
