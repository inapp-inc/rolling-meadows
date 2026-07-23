/* global RM */
(function () {
	'use strict';

	function t(key, params) {
		return RM.I18n.t(key, params);
	}

	var FH = RM.FormHelpers;

	document.addEventListener('DOMContentLoaded', function () {
		var urlClientId = RM.Navigation.getQueryParam('clientId');
		if (urlClientId) {
			window.location.replace(FH.workspaceUrl(urlClientId, 'intake'));
			return;
		}

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
				renderForm();
			}
		});
	});

	function renderForm() {
		var main = document.getElementById('page-content');
		var pending = RM.Session.getPendingCase() || RM.CaseCategories.defaultSelection();
		var workflow = RM.CaseWorkflow.forSubcategory(pending.subcategoryId);
		var ctx = RM.CaseForm.stageContextForPending(pending, 'intake');
		var assessmentCtx = RM.CaseForm.stageContextForPending(pending, 'assessment');

		var categoryBanner =
			'<div class="case-category-banner">' +
			'<strong>' + RM.Components.escapeHtml(RM.I18n.t('case.categoryBanner')) + '</strong> ' +
			RM.Components.escapeHtml(RM.CaseCategories.categoryLabel(pending.categoryId)) +
			' · <strong>' + RM.Components.escapeHtml(RM.I18n.t('case.subcategoryBanner')) + '</strong> ' +
			RM.Components.escapeHtml(RM.CaseCategories.subcategoryLabel(pending.subcategoryId)) +
			' · <strong>' + RM.Components.escapeHtml(t('pages.referralIntake.workflowLabel')) + '</strong> ' + RM.Components.escapeHtml(workflow.name) +
			' · <a href="' + RM.Links.page('case-creation') + '">' + RM.Components.escapeHtml(t('pages.referralIntake.change')) + '</a></div>';

		main.innerHTML =
			RM.Components.pageHeader(ctx.title, { moduleId: 'cases', lead: t('pages.referralIntake.stepLead') }) +
			categoryBanner +
			'<div id="alerts"></div>' +
			'<form id="referral-intake-form" class="card">' +
			RM.CaseForm.intakeFormHtml(ctx, { includePanelHeader: true }) +
			'<div id="live-cross-program"></div>' +
			'<div class="form-actions"><button type="submit" class="btn btn-primary">' +
			RM.Components.escapeHtml(t('pages.referralIntake.saveOpen', { next: assessmentCtx.title })) +
			'</button></div>' +
			'</form>';

		['client-name', 'client-dob', 'client-phone'].forEach(function (id) {
			var el = document.getElementById(id);
			el.addEventListener('input', liveCrossProgram);
			el.addEventListener('blur', liveDedup);
		});

		document.getElementById('referral-intake-form').addEventListener('submit', function (e) {
			e.preventDefault();
			submitForm(pending, ctx);
		});
	}

	function liveCrossProgram() {
		var partial = {
			name: document.getElementById('client-name').value,
			dob: document.getElementById('client-dob').value,
			phone: document.getElementById('client-phone').value
		};
		var flag = RM.CrossProgramFlagService.check(partial);
		var el = document.getElementById('live-cross-program');
		el.innerHTML = flag ? RM.Components.renderCrossProgramFlag(flag) : '';
	}

	function hasMeaningfulDedupInput(partial) {
		if ((partial.dob || '').trim()) {
			return true;
		}
		if ((partial.name || '').trim().length >= 2) {
			return true;
		}
		return (partial.phone || '').replace(/\D/g, '').length >= 7;
	}

	function liveDedup() {
		var partial = {
			name: document.getElementById('client-name').value,
			dob: document.getElementById('client-dob').value,
			phone: document.getElementById('client-phone').value
		};
		if (!hasMeaningfulDedupInput(partial)) {
			RM.Components.showDedupDrawer([], {});
			return;
		}
		var matches = RM.DeduplicationService.check(partial, null);
		RM.Components.showDedupDrawer(matches);
	}

	function submitForm(pending, ctx) {
		var payload = RM.CaseForm.readIntakePayload(ctx.config);
		var partial = payload.partial;

		var flag = RM.CrossProgramFlagService.check(partial);
		if (flag) {
			document.getElementById('alerts').innerHTML = RM.Components.renderCrossProgramFlag(flag);
		}

		var matches = RM.DeduplicationService.check(partial, null);
		if (matches.length) {
			RM.Components.showDuplicateModal(matches, null, function () { saveClient(pending, ctx, payload); });
			return;
		}
		saveClient(pending, ctx, payload);
	}

	function saveClient(pending, ctx, payload) {
		var user = RM.Session.getCurrentUser();
		var incomplete = !payload.partial.dob || !payload.intake.consentOnFile;
		var client = RM.ClientRepository.save({
			name: payload.partial.name,
			dob: payload.partial.dob,
			phone: payload.partial.phone,
			address: document.getElementById('client-address').value.trim(),
			programId: 'prog-senior-services',
			caseCategoryId: pending.categoryId,
			caseSubcategoryId: pending.subcategoryId,
			caseManagerId: user.id,
			status: 'active',
			incompleteIntake: incomplete
		});

		RM.Session.clearPendingCase();

		RM.ReferralRepository.save(Object.assign({
			clientId: client.id,
			dateReceived: new Date().toISOString().slice(0, 10)
		}, payload.referral));

		RM.IntakeRepository.save(Object.assign({ clientId: client.id }, payload.intake, {
			completeness: incomplete ? 'incomplete' : 'complete'
		}));

		RM.Audit.record('client:' + client.id, 'client_created', client.name);
		RM.Session.setActiveClientId(client.id);
		window.location.href = FH.workspaceUrl(client.id, ctx.nextTabId || 'assessment');
	}
})();
