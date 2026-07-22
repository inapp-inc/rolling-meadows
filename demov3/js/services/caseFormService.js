/* global RM */
(function () {
	'use strict';

	var FAMILY_BY_SUBCATEGORY = {
		'sub-seniors-at-risk': 'senior',
		'sub-in-home-support': 'in_home',
		'sub-nutrition-programs': 'nutrition',
		'sub-youth-empowerment': 'parenting',
		'sub-family-resource': 'parenting',
		'sub-parent-education': 'parenting',
		'sub-housing-assistance': 'parenting',
		'sub-crisis-response': 'mental_health',
		'sub-outpatient-counseling': 'mental_health',
		'sub-peer-support': 'mental_health',
		'sub-employment-support': 'employment',
		'sub-general-intake': 'general'
	};

	var SENIOR_DOMAINS = ['falls', 'nutrition', 'isolation', 'housing', 'abuseRisk'];
	var IN_HOME_DOMAINS = ['adlSupport', 'homeSafety', 'caregiverSupport', 'mobility', 'medicationManagement'];
	var NUTRITION_DOMAINS = ['foodAccess', 'mealDelivery', 'dietaryNeeds', 'weightMonitoring', 'socialDining'];
	var PARENTING_DOMAINS = ['attendance', 'transportation', 'childcare', 'familyStress', 'schoolEngagement'];
	var MENTAL_HEALTH_DOMAINS = ['suicideRisk', 'selfHarm', 'substanceUse', 'safetyPlan', 'supportSystem'];
	var EMPLOYMENT_DOMAINS = ['jobReadiness', 'skillsGap', 'transportation', 'childcare', 'incomeStability'];
	var GENERAL_DOMAINS = ['basicNeeds', 'housing', 'employment', 'health', 'supportNetwork'];

	var DOMAIN_LABELS = {
		falls: 'Fall risk',
		nutrition: 'Nutrition',
		isolation: 'Social isolation',
		housing: 'Housing stability',
		abuseRisk: 'Abuse or neglect',
		adlSupport: 'Activities of daily living',
		homeSafety: 'Home safety',
		caregiverSupport: 'Caregiver support',
		mobility: 'Mobility',
		medicationManagement: 'Medication management',
		foodAccess: 'Food access',
		mealDelivery: 'Meal program fit',
		dietaryNeeds: 'Dietary needs',
		weightMonitoring: 'Weight / appetite monitoring',
		socialDining: 'Social dining engagement',
		attendance: 'School attendance',
		transportation: 'Transportation',
		childcare: 'Childcare access',
		familyStress: 'Family stress',
		schoolEngagement: 'School engagement',
		suicideRisk: 'Suicide risk',
		selfHarm: 'Self-harm risk',
		substanceUse: 'Substance use',
		safetyPlan: 'Safety planning',
		supportSystem: 'Support system',
		jobReadiness: 'Job readiness',
		skillsGap: 'Skills gap',
		incomeStability: 'Income stability',
		basicNeeds: 'Basic needs',
		health: 'Health access',
		supportNetwork: 'Support network'
	};

	var BASE_LABELS = {
		referralSectionTitle: 'Referral',
		intakeSectionTitle: 'Intake',
		screeningSectionTitle: 'Screening questions',
		livingLabel: 'Living arrangement',
		backgroundLabel: 'Background / presenting concerns'
	};

	var FAMILY_CONFIG = {
		senior: Object.assign({}, BASE_LABELS, {
			backgroundLabel: 'Medical history / presenting concerns',
			sources: ['Family', 'Hospital', 'Physician', 'Police', 'Neighbor', 'Community agency', 'Self'],
			reasons: ['Self-neglect', 'Isolation', 'Cognitive decline', 'Falls', 'Medication issues', 'Food insecurity', 'Elder abuse', 'Unsafe living conditions', 'Welfare check'],
			intakeQuestions: [
				{ key: 'livesWith', fieldId: 'q-lives', label: 'Who do you live with?' },
				{ key: 'mealPrep', fieldId: 'q-meals', label: 'Meal preparation' },
				{ key: 'transportation', fieldId: 'q-transport', label: 'Transportation' },
				{ key: 'medication', fieldId: 'q-meds', label: 'Medication management' }
			],
			assessmentNoteLabel: 'Holistic assessment summary',
			assessmentNotePlaceholder: 'Document functional status, home environment, caregiver supports, and immediate concerns.',
			assessmentSummaryBackgroundLabel: 'Medical history',
			riskOverrideLabel: 'Clinical override note (optional)',
			carePlanIssueLabel: 'Issue',
			carePlanGoalLabel: 'Goal',
			carePlanServiceLabel: 'Service',
			carePlanListTitle: 'Care plan items',
			servicesTitle: 'Service coordination',
			cboTitle: 'CBO referrals',
			followupCadenceTitle: 'Follow-up cadence',
			followupMonitoringTitle: 'Ongoing monitoring & follow-up',
			noteTypes: ['phone call', 'home visit', 'provider coordination'],
			reassessmentTriggers: ['Manual', '6-month timer', 'Hospitalization', 'Post-PT progress'],
			closureServicesLabel: 'Services provided',
			closureOutcomesLabel: 'Outcomes achieved',
			closureRisksLabel: 'Remaining risks',
			closureReferralLabel: 'Referral-forward information'
		}),
		in_home: Object.assign({}, BASE_LABELS, {
			livingLabel: 'Home environment',
			backgroundLabel: 'Functional status / home support needs',
			screeningSectionTitle: 'In-home screening questions',
			sources: ['Hospital', 'Physician', 'Family', 'Home health agency', 'Self', 'Community agency'],
			reasons: ['ADL decline', 'Home safety concern', 'Caregiver burnout', 'Equipment need', 'Fall history', 'Hospital discharge', 'Medication management'],
			intakeQuestions: [
				{ key: 'livesWith', fieldId: 'q-lives', label: 'Who lives in the home?' },
				{ key: 'mealPrep', fieldId: 'q-meals', label: 'Meal preparation and nutrition at home' },
				{ key: 'transportation', fieldId: 'q-transport', label: 'Mobility and transportation in the home' },
				{ key: 'medication', fieldId: 'q-meds', label: 'Personal care and medication routines' }
			],
			assessmentNoteLabel: 'In-home needs assessment summary',
			assessmentNotePlaceholder: 'Summarize ADLs, home environment, equipment needs, and caregiver capacity.',
			assessmentSummaryBackgroundLabel: 'Functional background',
			riskOverrideLabel: 'Support priority override (optional)',
			carePlanIssueLabel: 'Support need',
			carePlanGoalLabel: 'Independence goal',
			carePlanServiceLabel: 'Home service',
			carePlanListTitle: 'In-home care plan items',
			servicesTitle: 'Provider coordination',
			cboTitle: 'Community provider referrals',
			followupCadenceTitle: 'Home visit cadence',
			followupMonitoringTitle: 'Home visit monitoring',
			noteTypes: ['phone call', 'home visit', 'caregiver coordination', 'provider coordination'],
			reassessmentTriggers: ['Manual', 'Quarterly review', 'Hospitalization', 'Functional change'],
			closureServicesLabel: 'In-home supports provided',
			closureOutcomesLabel: 'Independence outcomes',
			closureRisksLabel: 'Remaining home safety concerns',
			closureReferralLabel: 'Transition / handoff information'
		}),
		nutrition: Object.assign({}, BASE_LABELS, {
			livingLabel: 'Household / meal context',
			backgroundLabel: 'Nutrition history / dietary concerns',
			screeningSectionTitle: 'Nutrition screening questions',
			sources: ['Hospital', 'Physician', 'Community agency', 'Congregate meal site', 'Self', 'Family'],
			reasons: ['Food insecurity', 'Weight loss', 'Malnutrition risk', 'Meal delivery need', 'Dietary restrictions', 'Social isolation at meals'],
			intakeQuestions: [
				{ key: 'livesWith', fieldId: 'q-lives', label: 'Household and meal preparation supports' },
				{ key: 'mealPrep', fieldId: 'q-meals', label: 'Typical meals and food access' },
				{ key: 'transportation', fieldId: 'q-transport', label: 'Access to groceries or meal sites' },
				{ key: 'medication', fieldId: 'q-meds', label: 'Appetite, weight, or dietary restrictions noted' }
			],
			assessmentNoteLabel: 'Nutritional screening summary',
			assessmentNotePlaceholder: 'Document dietary needs, food access, weight/appetite concerns, and meal program eligibility.',
			assessmentSummaryBackgroundLabel: 'Nutrition background',
			riskOverrideLabel: 'Nutrition priority override (optional)',
			carePlanIssueLabel: 'Nutrition need',
			carePlanGoalLabel: 'Nutrition goal',
			carePlanServiceLabel: 'Meal program / service',
			carePlanListTitle: 'Nutrition support plan items',
			servicesTitle: 'Meal program enrollment',
			cboTitle: 'Community nutrition referrals',
			followupCadenceTitle: 'Nutrition check-in cadence',
			followupMonitoringTitle: 'Nutrition monitoring',
			noteTypes: ['phone call', 'meal site check-in', 'home visit', 'provider coordination'],
			reassessmentTriggers: ['Manual', 'Quarterly nutrition review', 'Weight change', 'Program change'],
			closureServicesLabel: 'Nutrition services provided',
			closureOutcomesLabel: 'Nutrition outcomes',
			closureRisksLabel: 'Remaining nutrition risks',
			closureReferralLabel: 'Program graduation / handoff'
		}),
		parenting: Object.assign({}, BASE_LABELS, {
			livingLabel: 'Household composition',
			backgroundLabel: 'Family background / presenting concerns',
			screeningSectionTitle: 'Family screening questions',
			sources: ['School', 'Family', 'Physician', 'Community agency', 'Self-referral', 'CBO partner', 'Police'],
			reasons: ['Chronic absenteeism', 'Behavior concerns', 'Parenting stress', 'Housing instability', 'Childcare barriers', 'Family conflict', 'Financial hardship', 'School engagement'],
			intakeQuestions: [
				{ key: 'livesWith', fieldId: 'q-lives', label: 'Household composition' },
				{ key: 'mealPrep', fieldId: 'q-meals', label: 'Food access and meal routines' },
				{ key: 'transportation', fieldId: 'q-transport', label: 'Transportation and school commute' },
				{ key: 'medication', fieldId: 'q-meds', label: 'Attendance patterns or barriers noted' }
			],
			assessmentNoteLabel: 'Family and needs assessment summary',
			assessmentNotePlaceholder: 'Summarize family strengths, attendance barriers, parenting concerns, and eligibility findings.',
			assessmentSummaryBackgroundLabel: 'Family background',
			riskOverrideLabel: 'Priority override note (optional)',
			carePlanIssueLabel: 'Barrier or need',
			carePlanGoalLabel: 'Family goal',
			carePlanServiceLabel: 'Intervention or referral',
			carePlanListTitle: 'Support plan items',
			servicesTitle: 'Resource coordination & referrals',
			cboTitle: 'Community partner referrals',
			followupCadenceTitle: 'Check-in cadence',
			followupMonitoringTitle: 'Ongoing support & monitoring',
			noteTypes: ['phone call', 'home visit', 'school meeting', 'case conference'],
			reassessmentTriggers: ['Manual', 'Quarterly review', 'School report', 'Plan milestone'],
			closureServicesLabel: 'Supports delivered',
			closureOutcomesLabel: 'Family outcomes',
			closureRisksLabel: 'Remaining concerns',
			closureReferralLabel: 'Warm handoff information'
		}),
		mental_health: Object.assign({}, BASE_LABELS, {
			livingLabel: 'Living situation',
			backgroundLabel: 'Clinical background / presenting concerns',
			screeningSectionTitle: 'Clinical screening questions',
			sources: ['Hospital', 'ER', 'Physician', 'Crisis line', 'Self', 'Family', 'Probation', 'Community agency'],
			reasons: ['Crisis presentation', 'Depression/anxiety', 'Substance use', 'Safety concern', 'Medication non-adherence', 'Hospital discharge', 'Peer referral'],
			intakeQuestions: [
				{ key: 'livesWith', fieldId: 'q-lives', label: 'Living situation and supports' },
				{ key: 'mealPrep', fieldId: 'q-meals', label: 'Daily functioning and self-care' },
				{ key: 'transportation', fieldId: 'q-transport', label: 'Access to appointments and services' },
				{ key: 'medication', fieldId: 'q-meds', label: 'Medication or treatment adherence' }
			],
			assessmentNoteLabel: 'Clinical assessment summary',
			assessmentNotePlaceholder: 'Document presenting concerns, safety status, supports, and treatment history.',
			assessmentSummaryBackgroundLabel: 'Clinical background',
			riskOverrideLabel: 'Acuity override note (optional)',
			carePlanIssueLabel: 'Clinical issue',
			carePlanGoalLabel: 'Treatment goal',
			carePlanServiceLabel: 'Modality or service',
			carePlanListTitle: 'Treatment plan items',
			servicesTitle: 'Therapy & crisis resource linkage',
			cboTitle: 'Ancillary referrals',
			followupCadenceTitle: 'Contact cadence',
			followupMonitoringTitle: 'Treatment monitoring',
			noteTypes: ['phone call', 'session note', 'crisis contact', 'care coordination'],
			reassessmentTriggers: ['Manual', 'Treatment plan review', 'Hospitalization', 'Safety event'],
			closureServicesLabel: 'Treatment provided',
			closureOutcomesLabel: 'Stabilization outcomes',
			closureRisksLabel: 'Remaining clinical risks',
			closureReferralLabel: 'Step-down or discharge handoff'
		}),
		employment: Object.assign({}, BASE_LABELS, {
			livingLabel: 'Household / dependents',
			backgroundLabel: 'Employment background / barriers',
			screeningSectionTitle: 'Workforce screening questions',
			sources: ['Workforce center', 'Community agency', 'Self', 'Family', 'Employer', 'School'],
			reasons: ['Job search', 'Job retention', 'Skills training', 'Income support', 'Transportation barrier', 'Childcare barrier'],
			intakeQuestions: [
				{ key: 'livesWith', fieldId: 'q-lives', label: 'Household and dependents' },
				{ key: 'mealPrep', fieldId: 'q-meals', label: 'Financial stability indicators' },
				{ key: 'transportation', fieldId: 'q-transport', label: 'Commute and transportation' },
				{ key: 'medication', fieldId: 'q-meds', label: 'Work history and barriers' }
			],
			assessmentNoteLabel: 'Workforce assessment summary',
			assessmentNotePlaceholder: 'Summarize skills, work history, barriers, and job readiness.',
			assessmentSummaryBackgroundLabel: 'Employment background',
			riskOverrideLabel: 'Barrier override note (optional)',
			carePlanIssueLabel: 'Employment barrier',
			carePlanGoalLabel: 'Employment goal',
			carePlanServiceLabel: 'Workforce service',
			carePlanListTitle: 'Employment action plan items',
			servicesTitle: 'Workforce referrals',
			cboTitle: 'Partner agency referrals',
			followupCadenceTitle: 'Job search cadence',
			followupMonitoringTitle: 'Employment monitoring',
			noteTypes: ['phone call', 'job coaching', 'employer contact', 'training check-in'],
			reassessmentTriggers: ['Manual', '90-day review', 'Job placement', 'Job loss'],
			closureServicesLabel: 'Workforce services provided',
			closureOutcomesLabel: 'Employment outcomes',
			closureRisksLabel: 'Remaining barriers',
			closureReferralLabel: 'Retention supports and referrals'
		}),
		general: Object.assign({}, BASE_LABELS, {
			sources: ['Walk-in', 'Community agency', 'Family', 'Hospital', 'Self', 'Partner referral'],
			reasons: ['Basic needs', 'Program routing', 'Eligibility screening', 'Housing', 'Utilities', 'Benefits enrollment', 'Unknown service need'],
			intakeQuestions: [
				{ key: 'livesWith', fieldId: 'q-lives', label: 'Household information' },
				{ key: 'mealPrep', fieldId: 'q-meals', label: 'Food and basic needs' },
				{ key: 'transportation', fieldId: 'q-transport', label: 'Transportation' },
				{ key: 'medication', fieldId: 'q-meds', label: 'Immediate needs identified' }
			],
			assessmentNoteLabel: 'Intake assessment summary',
			assessmentNotePlaceholder: 'Summarize eligibility, needs, and recommended program routing.',
			assessmentSummaryBackgroundLabel: 'Background',
			riskOverrideLabel: 'Priority override note (optional)',
			carePlanIssueLabel: 'Need',
			carePlanGoalLabel: 'Goal',
			carePlanServiceLabel: 'Referral or service',
			carePlanListTitle: 'Service plan items',
			servicesTitle: 'Program coordination',
			cboTitle: 'External referrals',
			followupCadenceTitle: 'Follow-up cadence',
			followupMonitoringTitle: 'Case monitoring',
			noteTypes: ['phone call', 'home visit', 'provider coordination'],
			reassessmentTriggers: ['Manual', '6-month timer', 'Program change', 'Needs change'],
			closureServicesLabel: 'Services provided',
			closureOutcomesLabel: 'Outcomes achieved',
			closureRisksLabel: 'Remaining needs',
			closureReferralLabel: 'Referral-forward information'
		})
	};

	function clientShape(pendingOrClient) {
		if (!pendingOrClient) { return null; }
		return {
			caseSubcategoryId: pendingOrClient.caseSubcategoryId || pendingOrClient.subcategoryId,
			caseCategoryId: pendingOrClient.caseCategoryId || pendingOrClient.categoryId
		};
	}

	function familyForClient(client) {
		if (!client) { return 'general'; }
		return FAMILY_BY_SUBCATEGORY[client.caseSubcategoryId] ||
			FAMILY_BY_SUBCATEGORY[client.caseCategoryId] ||
			'general';
	}

	function configForClient(client) {
		return FAMILY_CONFIG[familyForClient(client)] || FAMILY_CONFIG.general;
	}

	function domainsForFamily(family) {
		switch (family) {
			case 'in_home': return IN_HOME_DOMAINS;
			case 'nutrition': return NUTRITION_DOMAINS;
			case 'parenting': return PARENTING_DOMAINS;
			case 'mental_health': return MENTAL_HEALTH_DOMAINS;
			case 'employment': return EMPLOYMENT_DOMAINS;
			case 'general': return GENERAL_DOMAINS;
			default: return SENIOR_DOMAINS;
		}
	}

	function ratingDomainKeys(client, ratings) {
		var domains = client ? domainsForFamily(familyForClient(client)) : SENIOR_DOMAINS;
		var keys = domains.slice();
		if (ratings) {
			Object.keys(ratings).forEach(function (key) {
				if (keys.indexOf(key) === -1) { keys.push(key); }
			});
		}
		return keys;
	}

	function stageForTab(client, tabId) {
		if (!RM.CaseWorkflow || !client) { return null; }
		return RM.CaseWorkflow.stagesForClient(client).find(function (s) {
			return s.tabId === tabId;
		});
	}

	function nextStage(client, tabId) {
		var stage = stageForTab(client, tabId);
		if (!stage || !RM.CaseWorkflow) { return null; }
		return RM.CaseWorkflow.stagesForClient(client).find(function (s) {
			return s.stage === stage.stage + 1;
		});
	}

	function selectOptions(items, emptyLabel) {
		return '<option value="">' + RM.Components.escapeHtml(emptyLabel || 'Select…') + '</option>' +
			items.map(function (item) {
				return '<option value="' + RM.Components.escapeHtml(item) + '">' + RM.Components.escapeHtml(item) + '</option>';
			}).join('');
	}

	RM.CaseForm = {
		familyForClient: familyForClient,
		configForClient: configForClient,

		configForPending: function (pending) {
			return configForClient(clientShape(pending));
		},

		domainsForClient: function (client) {
			return domainsForFamily(familyForClient(client));
		},

		ratingDomainKeys: ratingDomainKeys,

		domainLabel: function (domainKey) {
			return DOMAIN_LABELS[domainKey] || domainKey.replace(/([A-Z])/g, ' $1').replace(/^./, function (s) {
				return s.toUpperCase();
			});
		},

		formatRatingsList: function (ratings, client) {
			if (!ratings) { return '—'; }
			var self = this;
			return '<ul>' + ratingDomainKeys(client, ratings).filter(function (key) {
				return ratings[key];
			}).map(function (key) {
				return '<li>' + RM.Components.escapeHtml(self.domainLabel(key)) + ': ' +
					RM.Components.riskBadge(ratings[key]) + '</li>';
			}).join('') + '</ul>';
		},

		formatRatingsTable: function (ratings, client) {
			if (!ratings) { return '—'; }
			var self = this;
			var levels = ['Low', 'Medium', 'High'];
			var keys = ratingDomainKeys(client, ratings).filter(function (key) {
				return ratings[key];
			});
			if (!keys.length) { return '—'; }
			return '<table class="data-table rating-table rating-table-readonly"><thead><tr><th>Domain</th>' +
				levels.map(function (l) {
					return '<th>' + RM.Components.escapeHtml(l) + '</th>';
				}).join('') + '</tr></thead><tbody>' +
				keys.map(function (key) {
					return '<tr><td>' + RM.Components.escapeHtml(self.domainLabel(key)) + '</td>' +
						levels.map(function (l) {
							var active = RM.FormHelpers.ratingMatches(ratings[key], l);
							return '<td class="rating-cell' + (active ? ' rating-cell-active' : '') + '">' +
								(active ? RM.Components.riskBadge(ratings[key]) : '—') + '</td>';
						}).join('') + '</tr>';
				}).join('') + '</tbody></table>';
		},

		profileTabLabels: function (client) {
			return this.profileSections(client).sections.map(function (s) { return s.title; });
		},

		profileSections: function (client) {
			var workflow = RM.CaseWorkflow.forClient(client);
			var sections = RM.CaseWorkflow.stagesForClient(client).map(function (s) {
				return {
					tabId: s.tabId,
					title: s.label,
					deliverable: s.deliverable || '',
					stageNum: s.stage
				};
			});
			sections.push({
				tabId: 'documents',
				title: 'Documents',
				deliverable: 'Consent forms and supporting files on record',
				stageNum: null,
				supplemental: true
			});
			return { workflow: workflow, sections: sections };
		},

		profileSectionHeader: function (section, client, options) {
			options = options || {};
			var esc = RM.Components.escapeHtml;
			var num = section.stageNum
				? '<span class="profile-360-section-num" aria-hidden="true">' + section.stageNum + '</span>'
				: '';
			var edit = options.hideWorkspaceLink ? '' :
				'<a href="' + RM.Links.page('case-workspace', {
					clientId: client.id,
					tab: section.tabId
				}) + '" class="btn btn-sm btn-secondary">' +
				esc(options.workspaceLinkLabel || 'Open in workspace') + '</a>';
			return '<header class="profile-360-section-header">' +
				'<div class="profile-360-section-heading">' + num +
				'<div><h2 class="profile-360-section-title">' + esc(section.title) + '</h2>' +
				(section.deliverable ? '<p class="profile-360-section-deliverable">' + esc(section.deliverable) + '</p>' : '') +
				'</div></div>' + edit + '</header>';
		},

		formatRiskScoreSummary: function (calc, options) {
			options = options || {};
			if (!calc || calc.compositeScore == null) {
				return '<div class="risk-score-summary risk-score-summary-pending">' +
					'<p class="risk-score-label">' + RM.Components.escapeHtml(options.label || 'Final risk score') + '</p>' +
					'<p class="risk-score-pending">Complete all domain ratings to calculate the composite score and overall risk level.</p></div>';
			}
			var html = '<div class="risk-score-summary">' +
				'<p class="risk-score-label">' + RM.Components.escapeHtml(options.label || 'Final risk score') + '</p>' +
				'<div class="risk-score-values">' +
				'<div class="risk-score-metric">' +
				'<span class="risk-score-metric-label">Composite score</span>' +
				'<strong class="risk-score-number">' + calc.compositeScore + '</strong></div>' +
				'<div class="risk-score-metric">' +
				'<span class="risk-score-metric-label">Overall risk level</span>' +
				'<span class="risk-score-badge">' + RM.Components.riskBadge(calc.overallRisk) + '</span></div>' +
				'</div>';
			if (options.assessedDate) {
				html += '<p class="risk-score-meta">Assessed ' + RM.Components.formatDate(options.assessedDate) + '</p>';
			}
			html += '</div>';
			return html;
		},

		riskScoringGuideHtml: function () {
			return '<aside class="risk-scoring-guide">' +
				'<h3 class="risk-scoring-guide-title">How case risk level is assigned</h3>' +
				'<p>Rate each domain above as <strong>Low</strong>, <strong>Medium</strong>, or <strong>High</strong>. ' +
				'The system averages those ratings to produce a composite score and an overall case risk level.</p>' +
				'<ul class="risk-scoring-rules">' +
				'<li>Low = 1 · Medium = 2 · High = 3</li>' +
				'<li>Composite score = average rating × 25 (rounded)</li>' +
				'<li><strong>High</strong> if average ≥ 2.5 · <strong>Medium</strong> if average ≥ 1.5 · otherwise <strong>Low</strong></li>' +
				'</ul>' +
				'<p class="risk-scoring-note">The optional override note is for documentation only; it does not change the calculated risk level.</p>' +
				'</aside>';
		},

		calcComposite: function (ratings, domains) {
			domains = domains || SENIOR_DOMAINS;
			var score = 0;
			var map = { Low: 1, Medium: 2, Moderate: 2, High: 3 };
			var count = 0;
			domains.forEach(function (d) {
				if (ratings[d]) {
					score += map[ratings[d]] || 0;
					count++;
				}
			});
			if (!count) {
				return { compositeScore: 0, overallRisk: 'Low' };
			}
			var avg = score / count;
			var overall = avg >= 2.5 ? 'High' : avg >= 1.5 ? 'Medium' : 'Low';
			return { compositeScore: Math.round(avg * 25), overallRisk: overall };
		},

		stageContext: function (client, tabId) {
			var stage = stageForTab(client, tabId);
			var next = nextStage(client, tabId);
			var family = familyForClient(client);
			var config = configForClient(client);

			return {
				tabId: tabId,
				title: stage ? stage.label : tabId,
				deliverable: stage ? stage.deliverable : '',
				stageNum: stage ? stage.stage : 1,
				nextTabId: next ? next.tabId : null,
				nextTitle: next ? next.label : '',
				family: family,
				config: config,
				domains: domainsForFamily(family),
				focusAreas: (RM.CaseWorkflow.forClient(client).focusAreas || [])
			};
		},

		stageContextForPending: function (pending, tabId) {
			return this.stageContext(clientShape(pending), tabId || 'intake');
		},

		panelHeader: function (ctx) {
			var html = '<h2>' + RM.Components.escapeHtml(ctx.title) + '</h2>';
			if (ctx.deliverable) {
				html += '<p class="workspace-stage-deliverable"><strong>Deliverable:</strong> ' +
					RM.Components.escapeHtml(ctx.deliverable) + '</p>';
			}
			if (ctx.focusAreas.length) {
				html += '<p class="workspace-stage-focus"><strong>Focus areas:</strong> ' +
					RM.Components.escapeHtml(ctx.focusAreas.join(' · ')) + '</p>';
			}
			return html;
		},

		saveContinueLabel: function (ctx, fallback) {
			if (ctx.nextTitle) {
				return 'Save &amp; Continue to ' + RM.Components.escapeHtml(ctx.nextTitle);
			}
			return fallback || 'Save';
		},

		intakeFormHtml: function (ctx, options) {
			options = options || {};
			var cfg = ctx.config;
			var dis = options.readOnly ? ' disabled' : '';
			var header = options.includePanelHeader === false ? '' : this.panelHeader(ctx);

			return header +
				'<h3 class="form-section-title">' + RM.Components.escapeHtml(cfg.referralSectionTitle) + '</h3>' +
				'<div class="form-row form-row-2">' +
				'<div class="form-group"><label for="ref-source">Referral source</label><select id="ref-source" required' + dis + '>' +
				selectOptions(cfg.sources) + '</select></div>' +
				'<div class="form-group"><label for="ref-reason">Reason</label><select id="ref-reason" required' + dis + '>' +
				selectOptions(cfg.reasons) + '</select></div></div>' +
				'<div class="form-group"><label for="ref-by">Referred by</label><input type="text" id="ref-by" required' + dis + '></div>' +
				'<h3 class="form-section-title">' + RM.Components.escapeHtml(cfg.intakeSectionTitle) + '</h3>' +
				'<div class="form-row form-row-2">' +
				'<div class="form-group"><label for="client-name">Client name</label><input type="text" id="client-name" required autocomplete="name"' + dis + '></div>' +
				'<div class="form-group"><label for="client-dob">Date of birth</label><input type="date" id="client-dob"' + dis + '></div></div>' +
				'<div class="form-row form-row-2">' +
				'<div class="form-group"><label for="client-phone">Phone</label><input type="tel" id="client-phone" autocomplete="tel"' + dis + '></div>' +
				'<div class="form-group"><label for="client-address">Address</label><input type="text" id="client-address"' + dis + '></div></div>' +
				'<div class="form-group"><label for="living">' + RM.Components.escapeHtml(cfg.livingLabel) + '</label><input type="text" id="living"' + dis + '></div>' +
				'<div class="form-group"><label for="medical">' + RM.Components.escapeHtml(cfg.backgroundLabel) + '</label><textarea id="medical" rows="3"' + dis + '></textarea></div>' +
				'<h3 class="form-section-title" style="font-size:0.9375rem;margin-top:1rem">' + RM.Components.escapeHtml(cfg.screeningSectionTitle) + '</h3>' +
				'<div class="form-row form-row-2 form-intake-grid">' +
				cfg.intakeQuestions.map(function (q) {
					return '<div class="form-group"><label for="' + q.fieldId + '">' + RM.Components.escapeHtml(q.label) + '</label>' +
						'<textarea id="' + q.fieldId + '" rows="2"' + dis + '></textarea></div>';
				}).join('') +
				'</div>' +
				'<div class="form-check-row"><label class="checkbox-label" for="consent">' +
				'<input type="checkbox" id="consent"' + dis + '><span>Consent on file</span></label></div>' +
				(options.submitLabel ?
					'<div class="form-actions"><button type="submit" class="btn btn-primary">' + options.submitLabel + '</button></div>' : '');
		},

		populateIntakeForm: function (client, cfg, intake, referral) {
			cfg = cfg || configForClient(client);
			var nameEl = document.getElementById('client-name');
			if (!nameEl) { return; }
			nameEl.value = client.name || '';
			document.getElementById('client-dob').value = client.dob || '';
			document.getElementById('client-phone').value = client.phone || '';
			document.getElementById('client-address').value = client.address || '';

			if (intake) {
				document.getElementById('living').value = intake.livingArrangement || '';
				document.getElementById('medical').value = intake.medicalHistory || '';
				document.getElementById('consent').checked = !!intake.consentOnFile;
				if (intake.intakeQuestions) {
					cfg.intakeQuestions.forEach(function (q) {
						var el = document.getElementById(q.fieldId);
						if (el) { el.value = intake.intakeQuestions[q.key] || ''; }
					});
				}
			}

			if (referral) {
				RM.FormHelpers.setSelectValue(document.getElementById('ref-source'), referral.source);
				RM.FormHelpers.setSelectValue(document.getElementById('ref-reason'), referral.reason);
				document.getElementById('ref-by').value = referral.referredBy || '';
			}
		},

		readIntakePayload: function (cfg) {
			var intakeQuestions = {};
			cfg.intakeQuestions.forEach(function (q) {
				var el = document.getElementById(q.fieldId);
				intakeQuestions[q.key] = el ? el.value : '';
			});
			return {
				partial: {
					name: document.getElementById('client-name').value.trim(),
					dob: document.getElementById('client-dob').value,
					phone: document.getElementById('client-phone').value.trim()
				},
				referral: {
					source: document.getElementById('ref-source').value,
					reason: document.getElementById('ref-reason').value,
					referredBy: document.getElementById('ref-by').value.trim()
				},
				intake: {
					livingArrangement: document.getElementById('living').value.trim(),
					medicalHistory: document.getElementById('medical').value.trim(),
					consentOnFile: document.getElementById('consent').checked,
					intakeQuestions: intakeQuestions
				}
			};
		}
	};
})();
