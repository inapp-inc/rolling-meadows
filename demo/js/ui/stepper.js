/* global RM */
(function () {
	'use strict';

	var STAGES = [
		{ id: 'referral', label: 'Referral', page: 'referral-intake.html' },
		{ id: 'intake', label: 'Intake', page: 'referral-intake.html' },
		{ id: 'assessment', label: 'Assessment', page: 'risk-assessment.html' },
		{ id: 'careplan', label: 'Care Plan', page: 'care-plan.html' },
		{ id: 'services', label: 'Services', page: 'service-coordination.html' },
		{ id: 'monitoring', label: 'Monitoring', page: 'monitoring.html' },
		{ id: 'reassessment', label: 'Reassessment', page: 'reassessment.html' },
		{ id: 'closure', label: 'Closure', page: 'case-closure.html' }
	];

	var PAGE_ORDER = STAGES.reduce(function (acc, s, i) {
		if (!acc[s.page]) { acc[s.page] = i; }
		return acc;
	}, {});

	RM.Stepper = {
		render: function (containerId, activePage) {
			var container = document.getElementById(containerId);
			if (!container) { return; }
			var clientId = RM.Navigation.resolveClientId();
			var activeIdx = PAGE_ORDER[activePage] != null ? PAGE_ORDER[activePage] : -1;
			var html = '<nav class="workflow-stepper" aria-label="Case workflow stages"><ol>';
			STAGES.forEach(function (stage, i) {
				var isActive = stage.page === activePage ||
					(activePage === 'referral-intake.html' && i <= 1);
				var isCompleted = activeIdx > i;
				var cls = isActive ? 'active' : isCompleted ? 'completed' : '';
				var href = clientId
					? RM.Navigation.clientUrl(stage.page, clientId)
					: stage.page;
				html += '<li class="' + cls + '">' +
					'<a href="' + href + '">' +
					'<span class="step-num">' + (isCompleted ? '✓' : (i + 1)) + '</span> ' +
					'<span>' + RM.Components.escapeHtml(stage.label) + '</span></a></li>';
			});
			html += '</ol></nav>';
			container.innerHTML = html;
		}
	};
})();
