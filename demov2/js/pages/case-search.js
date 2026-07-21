/* global RM */
(function () {
	'use strict';

	document.addEventListener('DOMContentLoaded', function () {
		RM.Boot.init({
			activeModule: 'cases',
			activeNav: 'case-search',
			onReady: function () {
				if (RM.Permissions.isAuditor()) {
					window.location.href = 'reports.html';
					return;
				}
				if (!RM.Permissions.canViewCaseDetail()) {
					window.location.href = RM.Links.page('client-search');
					return;
				}
				renderPage(RM.Session.getCurrentUser());
			}
		});
	});

	function renderPage(user) {
		var main = document.getElementById('page-content');
		var categories = RM.CaseCategories.list;

		main.innerHTML =
			RM.Components.modulePageHeader('case-search') +
			'<div class="case-search-filters card">' +
			'<div class="form-row form-row-3">' +
			'<div class="form-group form-group-grow"><label for="case-search-input">Search cases</label>' +
			'<input type="search" id="case-search-input" placeholder="Client name, phone, or address…"></div>' +
			'<div class="form-group"><label for="case-filter-category">Case category</label>' +
			'<select id="case-filter-category"><option value="">All categories</option>' +
			categories.map(function (cat) {
				return '<option value="' + cat.id + '">' + RM.Components.escapeHtml(cat.label) + '</option>';
			}).join('') +
			'</select></div>' +
			'<div class="form-group"><label for="case-filter-subcategory">Subcategory</label>' +
			'<select id="case-filter-subcategory"><option value="">All subcategories</option></select></div>' +
			'</div></div>' +
			'<div id="case-search-results" class="case-search-results"></div>';

		var categoryEl = document.getElementById('case-filter-category');
		var subcategoryEl = document.getElementById('case-filter-subcategory');
		var searchInput = document.getElementById('case-search-input');
		var searchTimer = null;

		function refreshSubcategories() {
			var catId = categoryEl.value;
			var subs = catId ? RM.CaseCategories.subcategoriesFor(catId) : [];
			subcategoryEl.innerHTML = '<option value="">All subcategories</option>' +
				subs.map(function (sub) {
					return '<option value="' + sub.id + '">' + RM.Components.escapeHtml(sub.label) + '</option>';
				}).join('');
		}

		function caseloadClients() {
			return RM.Data.caseloadForUser(user).filter(function (c) {
				return c.status === 'active' || c.status === 'open' || c.status === 'closed';
			});
		}

		function filterCases() {
			var q = searchInput.value.trim().toLowerCase();
			var catFilter = categoryEl.value;
			var subFilter = subcategoryEl.value;
			var clients = caseloadClients();

			if (q) {
				clients = RM.ClientRepository.search(q).filter(function (c) {
					return caseloadClients().some(function (x) { return x.id === c.id; });
				});
			}

			if (catFilter) {
				clients = clients.filter(function (c) { return c.caseCategoryId === catFilter; });
			}
			if (subFilter) {
				clients = clients.filter(function (c) { return c.caseSubcategoryId === subFilter; });
			}

			return clients;
		}

		function renderResults() {
			var clients = filterCases();
			var el = document.getElementById('case-search-results');

			if (!clients.length) {
				el.innerHTML = RM.Components.emptyState('No cases found', 'Try adjusting filters or search terms.');
				return;
			}

			var rows = clients.map(function (c) {
				var workflow = RM.CaseWorkflow.forClient(c);
				var stageStatus = RM.Workflow.getStatus(c);
				var cm = RM.UserRepository.findById(c.caseManagerId);
				var caseType = RM.CaseCategories.subcategoryLabel(c.caseSubcategoryId) ||
					RM.CaseCategories.categoryLabel(c.caseCategoryId);
				return '<tr class="case-search-row" data-client-id="' + RM.Components.escapeHtml(c.id) + '" role="button" tabindex="0">' +
					'<td class="col-client"><strong title="' + RM.Components.escapeHtml(c.name) + '">' +
					RM.Components.escapeHtml(c.name) + '</strong></td>' +
					'<td class="col-type"><span class="case-type-chip" title="' + RM.Components.escapeHtml(caseType) + '">' +
					RM.Components.escapeHtml(caseType) + '</span></td>' +
					'<td class="col-workflow"><span class="case-workflow-name" title="' + RM.Components.escapeHtml(workflow.name) + '">' +
					RM.Components.escapeHtml(workflow.name) + '</span></td>' +
					'<td class="col-stage"><span class="case-stage-chip" title="' + RM.Components.escapeHtml(stageStatus.label) + '">' +
					'Stage ' + stageStatus.stage + '</span></td>' +
					'<td class="col-manager" title="' + RM.Components.escapeHtml(cm ? cm.name : '—') + '">' +
					RM.Components.escapeHtml(cm ? cm.name : '—') + '</td>' +
					'<td class="col-opened">' + RM.Components.formatDate(c.createdAt) + '</td>' +
					'<td class="col-status">' + RM.Components.escapeHtml(c.status) + '</td>' +
					'<td class="col-action">' +
					'<a href="' + RM.Links.page('case-workspace', { clientId: c.id }) + '" class="btn btn-sm btn-primary" onclick="event.stopPropagation()">Open</a>' +
					'</td></tr>';
			}).join('');

			el.innerHTML =
				'<div class="card case-search-results-card">' +
				'<div class="table-responsive">' +
				'<table class="data-table data-table-interactive case-search-table">' +
				'<thead><tr><th>Client</th><th>Program</th><th>Workflow</th><th>Stage</th>' +
				'<th>Case manager</th><th>Opened</th><th>Status</th><th></th></tr></thead>' +
				'<tbody>' + rows + '</tbody></table></div></div>';

			var table = el.querySelector('.data-table-interactive');
			RM.Components.wireInteractiveTable(table, '.case-search-row', function (row) {
				var client = RM.ClientRepository.findById(row.getAttribute('data-client-id'));
				if (client) {
					RM.Components.openCaseDrawer(client, table, '.case-search-row');
				}
			});
		}

		categoryEl.addEventListener('change', function () {
			refreshSubcategories();
			renderResults();
		});
		subcategoryEl.addEventListener('change', renderResults);

		function scheduleSearch() {
			window.clearTimeout(searchTimer);
			searchTimer = window.setTimeout(renderResults, 200);
		}

		searchInput.addEventListener('input', scheduleSearch);
		searchInput.addEventListener('keydown', function (e) {
			if (e.key === 'Enter') {
				window.clearTimeout(searchTimer);
				renderResults();
			}
		});

		refreshSubcategories();
		renderResults();
	}
})();
