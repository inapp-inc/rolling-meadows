/* global RM */
(function () {
	'use strict';

	document.addEventListener('DOMContentLoaded', function () {
		RM.Boot.init({
			activeModule: 'cases',
			activeNav: 'case-creation',
			onReady: function () {
				if (RM.Permissions.isAuditor()) {
					window.location.href = 'reports.html';
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
		var main = document.getElementById('page-content');
		var pending = RM.Session.getPendingCase() || RM.CaseCategories.defaultSelection();
		var categories = RM.CaseCategories.list;

		main.innerHTML =
			RM.Components.modulePageHeader('case-creation') +
			'<form id="case-creation-form" class="card">' +
			'<h2>Case category</h2>' +
			'<div class="form-row form-row-2">' +
			'<div class="form-group"><label for="case-category">Case category</label>' +
			'<select id="case-category" required>' +
			categories.map(function (cat) {
				return '<option value="' + cat.id + '">' + RM.Components.escapeHtml(cat.label) + '</option>';
			}).join('') +
			'</select></div>' +
			'<div class="form-group"><label for="case-subcategory">Subcategory</label>' +
			'<select id="case-subcategory" required></select></div></div>' +
			'<div id="workflow-preview" class="workflow-preview card"></div>' +
			'<div class="form-actions">' +
			'<button type="submit" class="btn btn-primary">Continue to referral & intake</button>' +
			'</div></form>';

		var categoryEl = document.getElementById('case-category');
		var subcategoryEl = document.getElementById('case-subcategory');

		function refreshSubcategories() {
			var subs = RM.CaseCategories.subcategoriesFor(categoryEl.value);
			subcategoryEl.innerHTML = subs.map(function (sub) {
				return '<option value="' + sub.id + '">' + RM.Components.escapeHtml(sub.label) + '</option>';
			}).join('');
			refreshWorkflowPreview();
		}

		function refreshWorkflowPreview() {
			var preview = document.getElementById('workflow-preview');
			var workflow = RM.CaseWorkflow.forSubcategory(subcategoryEl.value);
			if (!workflow) {
				preview.innerHTML = '<p class="text-muted">Select a subcategory to preview the workflow.</p>';
				return;
			}
			preview.innerHTML =
				'<h3>' + RM.Components.escapeHtml(workflow.name) + '</h3>' +
				'<p>' + RM.Components.escapeHtml(workflow.description) + '</p>' +
				(workflow.exampleProgram ? '<p class="workflow-preview-example"><em>' +
					RM.Components.escapeHtml(workflow.exampleProgram) + '</em></p>' : '') +
				'<ol class="workflow-preview-stages">' +
				workflow.stages.map(function (s) {
					return '<li><strong>' + RM.Components.escapeHtml(s.label) + '</strong>' +
						(s.deliverable ? ' — ' + RM.Components.escapeHtml(s.deliverable) : '') + '</li>';
				}).join('') +
				'</ol>';
		}

		categoryEl.value = pending.categoryId || RM.CaseCategories.defaultSelection().categoryId;
		refreshSubcategories();
		subcategoryEl.value = pending.subcategoryId || RM.CaseCategories.defaultSelection().subcategoryId;
		refreshWorkflowPreview();

		categoryEl.addEventListener('change', refreshSubcategories);
		subcategoryEl.addEventListener('change', refreshWorkflowPreview);

		document.getElementById('case-creation-form').addEventListener('submit', function (e) {
			e.preventDefault();
			RM.Session.setPendingCase({
				categoryId: categoryEl.value,
				subcategoryId: subcategoryEl.value
			});
			window.location.href = RM.Links.page('referral-intake');
		});
	}
})();
