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
		var categories = RM.CaseCategories.localizedCategories();
		var t = RM.I18n.t.bind(RM.I18n);

		main.innerHTML =
			RM.Components.modulePageHeader('case-creation') +
			'<form id="case-creation-form" class="card">' +
			'<h2>' + RM.Components.escapeHtml(t('case.caseCategory')) + '</h2>' +
			'<div class="form-row form-row-2">' +
			'<div class="form-group"><label for="case-category">' + RM.Components.escapeHtml(t('case.caseCategory')) + '</label>' +
			'<select id="case-category" required>' +
			categories.map(function (cat) {
				return '<option value="' + cat.id + '">' + RM.Components.escapeHtml(cat.label) + '</option>';
			}).join('') +
			'</select></div>' +
			'<div class="form-group"><label for="case-subcategory">' + RM.Components.escapeHtml(t('case.subcategory')) + '</label>' +
			'<select id="case-subcategory" required></select></div></div>' +
			'<div id="workflow-preview" class="workflow-preview card"></div>' +
			'<div class="form-actions">' +
			'<button type="submit" class="btn btn-primary">' + RM.Components.escapeHtml(t('case.continueReferral')) + '</button>' +
			'</div></form>';

		var categoryEl = document.getElementById('case-category');
		var subcategoryEl = document.getElementById('case-subcategory');

		function refreshSubcategories() {
			var cat = categories.find(function (item) { return item.id === categoryEl.value; });
			var subs = cat ? cat.subcategories : [];
			subcategoryEl.innerHTML = subs.map(function (sub) {
				return '<option value="' + sub.id + '">' + RM.Components.escapeHtml(sub.label) + '</option>';
			}).join('');
			refreshWorkflowPreview();
		}

		function refreshWorkflowPreview() {
			var preview = document.getElementById('workflow-preview');
			var workflow = RM.CaseWorkflow.forSubcategory(subcategoryEl.value);
			if (!workflow) {
				preview.innerHTML = '<p class="text-muted">' + RM.Components.escapeHtml(t('case.selectSubcategoryPreview')) + '</p>';
				return;
			}
			preview.innerHTML =
				'<h3>' + RM.Components.escapeHtml(workflow.name) + '</h3>' +
				'<p>' + RM.Components.escapeHtml(workflow.description) + '</p>' +
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
