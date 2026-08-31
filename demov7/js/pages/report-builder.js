/* global RM */
(function () {
	'use strict';

	function t(key, params) {
		return RM.I18n.t(key, params);
	}

	var CHART_COLORS = ['#2563eb', '#059669', '#7c3aed', '#db2777', '#d97706', '#0891b2', '#64748b', '#dc2626'];

	var state = {
		id: null,
		name: '',
		reportType: 'table',
		primaryEntity: 'client',
		joins: [],
		columns: [],
		filters: [],
		sortBy: { entity: 'client', field: 'name', dir: 'asc' },
		joinAggregates: { riskAssessment: 'latest' },
		showAdvanced: false,
		chart: {
			xAxis: null,
			yAxis: { aggregate: 'count', cumulative: false },
			xGrouping: 'none',
			chartType: 'bar'
		},
		lastResult: null,
		lastChartResult: null,
		dragField: null
	};

	document.addEventListener('DOMContentLoaded', function () {
		RM.Boot.init({
			activeModule: 'analytics',
			activeNav: 'report-builder',
			onReady: function () {
				if (RM.Permissions.isAuditor() || RM.Permissions.isLiaison()) {
					window.location.href = 'reports.html';
					return;
				}
				var main = document.getElementById('page-content');
				wireEvents(main);
				if (!applyTemplateFromUrl() && !state.columns.length && state.reportType === 'table') {
					applyDefaultTableConfig();
				}
				renderPage();
			}
		});
	});

	function renderPage() {
		RM.Components.closeSideDrawer();
		var main = document.getElementById('page-content');
		main.innerHTML =
			RM.Components.modulePageHeader('report-builder') +
			'<div class="rb-shell">' +
			'<p class="text-muted report-builder-lead">' + RM.Components.escapeHtml(t('pages.reportBuilder.lead')) + '</p>' +
			renderToolbar() +
			renderTypeToggle() +
			'<div class="rb-config-column">' +
			(state.reportType === 'chart' ? renderChartConfig() : renderTableConfig()) +
			'</div>' +
			renderPreviewCard() +
			'</div>';

		populateSavedReports();
		if (state.reportType === 'chart') {
			wireDragAndDrop(main);
		}
		runPreview(false);
	}

	function isYAxisFilled() {
		return !!(state.chart.yAxis && (state.chart.yAxis.field ||
			(state.chart.yAxis.aggregate === 'count' && !state.chart.yAxis.field)));
	}

	function renderToolbar() {
		return '<div class="report-builder-toolbar card">' +
			'<div class="report-builder-toolbar-fields">' +
			'<div class="form-group report-builder-name-group">' +
			'<label for="rb-name">' + RM.Components.escapeHtml(t('pages.reportBuilder.reportName')) + '</label>' +
			'<input type="text" id="rb-name" value="' + RM.Components.escapeHtml(state.name) + '" placeholder="' +
			RM.Components.escapeHtml(t('pages.reportBuilder.reportNamePlaceholder')) + '">' +
			'</div>' +
			'<div class="form-group">' +
			'<label for="rb-saved">' + RM.Components.escapeHtml(t('pages.reportBuilder.savedReports')) + '</label>' +
			'<div class="rb-saved-row">' +
			'<select id="rb-saved"><option value="">' + RM.Components.escapeHtml(t('pages.reportBuilder.newReport')) + '</option></select>' +
			'<button type="button" class="btn btn-secondary btn-sm" id="rb-new">' + RM.Components.escapeHtml(t('pages.reportBuilder.newReportBtn')) + '</button>' +
			'</div></div></div>' +
			'<div class="report-builder-toolbar-actions">' +
			'<button type="button" class="btn btn-secondary" id="rb-save">' + RM.Components.escapeHtml(t('pages.reportBuilder.save')) + '</button>' +
			'<button type="button" class="btn btn-primary" id="rb-run">' + RM.Components.escapeHtml(t('pages.reportBuilder.run')) + '</button>' +
			'<button type="button" class="btn btn-secondary" id="rb-export">' +
			RM.Components.escapeHtml(t(state.reportType === 'chart' ? 'pages.reportBuilder.exportChart' : 'pages.reportBuilder.export')) +
			'</button>' +
			'</div></div>';
	}

	function renderTypeToggle() {
		return '<div class="rb-type-toggle" role="tablist" aria-label="' + RM.Components.escapeHtml(t('pages.reportBuilder.reportType')) + '">' +
			'<button type="button" class="rb-type-btn' + (state.reportType === 'table' ? ' is-active' : '') +
			'" data-report-type="table" role="tab" aria-selected="' + (state.reportType === 'table' ? 'true' : 'false') + '">' +
			RM.Components.icon('spreadsheet') + '<span>' + RM.Components.escapeHtml(t('pages.reportBuilder.typeTable')) + '</span></button>' +
			'<button type="button" class="rb-type-btn' + (state.reportType === 'chart' ? ' is-active' : '') +
			'" data-report-type="chart" role="tab" aria-selected="' + (state.reportType === 'chart' ? 'true' : 'false') + '">' +
			RM.Components.icon('chart') + '<span>' + RM.Components.escapeHtml(t('pages.reportBuilder.typeChart')) + '</span></button>' +
			'</div>';
	}

	function renderTableConfig() {
		return '<section class="card rb-step-card">' +
			renderSourceStepHeader('pages.reportBuilder.stepSource', 'pages.reportBuilder.stepSourceHint') +
			renderEntitySourcePanel('pages.reportBuilder.sourceManualNote') +
			'</section>' +
			'<section class="card rb-step-card">' +
			'<div class="rb-step-header"><span class="rb-step-num">2</span><h2>' + RM.Components.escapeHtml(t('pages.reportBuilder.stepQuickBuild')) + '</h2></div>' +
			'<p class="text-muted rb-step-lead">' + RM.Components.escapeHtml(t('pages.reportBuilder.stepQuickBuildHint')) + '</p>' +
			'<div class="form-group rb-columns-group"><span class="form-label">' + RM.Components.escapeHtml(t('pages.reportBuilder.columns')) + '</span>' +
			'<div id="rb-column-picker" class="rb-column-picker">' + renderColumnPicker() + '</div></div>' +
			'</section>' +
			'<section class="card rb-step-card rb-advanced-section">' +
			'<button type="button" class="rb-advanced-toggle" id="rb-advanced-toggle" aria-expanded="' + (state.showAdvanced ? 'true' : 'false') + '">' +
			RM.Components.escapeHtml(t('pages.reportBuilder.advancedOptions')) +
			' <span class="rb-advanced-chevron">' + (state.showAdvanced ? '▾' : '▸') + '</span></button>' +
			(state.showAdvanced ? renderTableAdvanced() : '') +
			'</section>';
	}

	function renderTableAdvanced() {
		return '<div class="rb-advanced-body">' +
			'<div class="form-group"><span class="form-label">' + RM.Components.escapeHtml(t('pages.reportBuilder.joinEntities')) + '</span>' +
			'<div id="rb-joins" class="rb-field-pills">' + renderJoinPills() + '</div></div>' +
			'<div class="form-group"><span class="form-label">' + RM.Components.escapeHtml(t('pages.reportBuilder.filters')) + '</span>' +
			'<div id="rb-filters">' + renderFilters() + '</div>' +
			'<button type="button" class="btn btn-secondary btn-sm" id="rb-add-filter">' + RM.Components.escapeHtml(t('pages.reportBuilder.addFilter')) + '</button></div>' +
			'</div>';
	}

	function renderChartConfig() {
		return '<section class="card rb-step-card">' +
			renderSourceStepHeader('pages.reportBuilder.stepChartSource', 'pages.reportBuilder.stepChartSourceHint') +
			renderEntitySourcePanel('pages.reportBuilder.sourceChartManualNote') +
			'</section>' +
			'<section class="card rb-step-card">' +
			'<div class="rb-step-header"><span class="rb-step-num">2</span><h2>' + RM.Components.escapeHtml(t('pages.reportBuilder.stepChartCanvas')) + '</h2></div>' +
			'<p class="text-muted rb-step-lead">' + RM.Components.escapeHtml(t('pages.reportBuilder.stepChartCanvasHint')) + '</p>' +
			'<div class="rb-chart-workspace">' +
			'<p class="text-muted rb-palette-hint">' + RM.Components.escapeHtml(t('pages.reportBuilder.crossModelHint')) + '</p>' +
			'<div class="rb-field-palette rb-field-palette-grouped" id="rb-field-palette">' + renderFieldPalette() + '</div>' +
			'<div class="rb-chart-canvas" id="rb-chart-canvas">' +
			'<div class="rb-chart-y-rail">' +
			'<div class="rb-axis-drop rb-axis-drop-y' + (isYAxisFilled() ? ' is-filled' : '') +
				'" id="rb-drop-y" data-axis="y">' + renderAxisDropContent('y') + '</div>' +
			'<div class="rb-axis-label rb-axis-label-y">' + RM.Components.escapeHtml(t('pages.reportBuilder.axisY')) + '</div>' +
			'</div>' +
			'<div class="rb-chart-plot">' +
			'<div class="rb-chart-plot-grid" aria-hidden="true"></div>' +
			'<div class="rb-axis-drop rb-axis-drop-x' + (state.chart.xAxis ? ' is-filled' : '') +
				'" id="rb-drop-x" data-axis="x">' + renderAxisDropContent('x') + '</div>' +
			'<div class="rb-axis-label rb-axis-label-x">' + RM.Components.escapeHtml(t('pages.reportBuilder.axisX')) + '</div>' +
			'</div></div></div>' +
			'<div class="rb-chart-guide card" id="rb-chart-guide">' + renderChartGuide() + '</div>' +
			'</section>' +
			'<section class="card rb-step-card">' +
			'<div class="rb-step-header"><span class="rb-step-num">3</span><h2>' + RM.Components.escapeHtml(t('pages.reportBuilder.stepChartOptions')) + '</h2></div>' +
			renderChartOptions() +
			'</section>';
	}

	function renderPreviewCard() {
		return '<section class="card rb-preview-card">' +
			'<div class="card-header">' +
			'<h2>' + RM.Components.escapeHtml(t('pages.reportBuilder.preview')) + '</h2>' +
			'<span id="rb-preview-meta" class="report-builder-row-count"></span></div>' +
			'<div id="rb-preview"></div></section>';
	}

	function renderSourceStepHeader(titleKey, hintKey) {
		return '<div class="rb-step-header"><span class="rb-step-num">1</span><h2>' + RM.Components.escapeHtml(t(titleKey)) + '</h2></div>' +
			'<p class="text-muted rb-step-lead">' + RM.Components.escapeHtml(t(hintKey)) + '</p>';
	}

	function renderEntitySourcePanel(noteKey) {
		return '<div class="rb-source-panel rb-source-entities">' +
			'<div class="rb-source-panel-head">' +
			'<h3>' + RM.Components.escapeHtml(t('pages.reportBuilder.sourceDataSource')) + '</h3>' +
			'<p class="text-muted">' + RM.Components.escapeHtml(t('pages.reportBuilder.sourceDataSourceHint')) + '</p></div>' +
			'<div class="rb-entity-chips" id="rb-entity-chips">' + renderEntityChips() + '</div>' +
			'<p class="rb-source-note text-muted">' + RM.Components.escapeHtml(t(noteKey)) + '</p></div>';
	}

	function renderEntityChips() {
		var core = ['client', 'case', 'serviceEnrollment', 'cboReferral', 'riskAssessment', 'referral'];
		var extended = ['intake', 'caseNote', 'carePlan', 'document', 'user', 'initiative', 'serviceUtil'];
		function chip(entityId) {
			var active = state.primaryEntity === entityId;
			return '<button type="button" class="rb-entity-chip' + (active ? ' is-active' : '') + '" data-entity="' + entityId + '">' +
				RM.Components.escapeHtml(RM.ReportDataModel.label(entityId)) + '</button>';
		}
		return '<div class="rb-entity-chip-row">' + core.map(chip).join('') + '</div>' +
			'<div class="rb-entity-chip-row rb-entity-chip-row-secondary">' + extended.map(chip).join('') + '</div>';
	}

	function renderJoinPills() {
		var joins = RM.ReportDataModel.availableJoins(state.primaryEntity);
		if (!joins.length) {
			return '<span class="text-muted">' + RM.Components.escapeHtml(t('pages.reportBuilder.noJoins')) + '</span>';
		}
		return joins.map(function (join) {
			var active = state.joins.indexOf(join.entity) !== -1;
			return '<button type="button" class="rb-pill' + (active ? ' is-selected' : '') + '" data-join="' + join.entity + '">' +
				RM.Components.escapeHtml(join.label) + '</button>';
		}).join('');
	}

	function defaultColumnsForEntity(entityId) {
		return RM.ReportDataModel.reportableFieldRefs(entityId).slice(0, 4).map(function (ref) {
			return { entity: ref.entity, field: ref.field };
		});
	}

	function isColumnSelected(entityId, fieldId) {
		return state.columns.some(function (col) {
			return col.entity === entityId && col.field === fieldId;
		});
	}

	function renderSelectedColumns() {
		if (!state.columns.length) {
			return '<p class="text-muted rb-column-selected-empty">' +
				RM.Components.escapeHtml(t('pages.reportBuilder.noColumnsSelected')) + '</p>';
		}
		return '<div class="rb-column-selected">' + state.columns.map(function (col, index) {
			return '<span class="rb-column-selected-chip">' +
				'<span class="rb-column-selected-label">' +
				RM.Components.escapeHtml(RM.ReportDataModel.fieldDisplayLabel(col.entity, col.field)) + '</span>' +
				'<button type="button" class="rb-column-remove" data-column-index="' + index + '" aria-label="' +
				RM.Components.escapeHtml(t('pages.reportBuilder.removeColumn')) + '">×</button></span>';
		}).join('') + '</div>';
	}

	function renderColumnPicker() {
		var entityIds = entitiesInScope();
		var refs = RM.ReportDataModel.reportableFieldRefs(state.primaryEntity);

		return renderSelectedColumns() +
			'<div class="rb-column-picker-toolbar">' +
			'<input type="search" id="rb-column-search" class="rb-column-search" placeholder="' +
			RM.Components.escapeHtml(t('pages.reportBuilder.searchColumns')) + '" autocomplete="off">' +
			'<span class="rb-column-picker-count">' + RM.Components.escapeHtml(t('pages.reportBuilder.columnCount', {
				count: state.columns.length
			})) + '</span></div>' +
			'<div class="rb-column-picker-list" id="rb-column-picker-list">' +
			entityIds.map(function (entityId) {
				var entityRefs = refs.filter(function (ref) { return ref.entity === entityId; });
				if (!entityRefs.length) { return ''; }
				var selectedInEntity = entityRefs.filter(function (ref) {
					return isColumnSelected(ref.entity, ref.field);
				}).length;
				return '<details class="rb-column-entity" open>' +
					'<summary class="rb-column-entity-summary">' +
					RM.Components.escapeHtml(RM.ReportDataModel.label(entityId)) +
					' <span class="rb-column-entity-count">' + selectedInEntity + '/' + entityRefs.length + '</span></summary>' +
					'<ul class="rb-column-options">' + entityRefs.map(function (ref) {
						var checked = isColumnSelected(ref.entity, ref.field);
						var searchText = (RM.ReportDataModel.label(ref.entity) + ' ' + ref.label).toLowerCase();
						return '<li class="rb-column-option' + (checked ? ' is-selected' : '') +
							'" data-search="' + RM.Components.escapeHtml(searchText) + '">' +
							'<label class="rb-column-option-label">' +
							'<input type="checkbox" class="rb-column-checkbox" data-column-entity="' + ref.entity +
							'" data-column-field="' + ref.field + '"' + (checked ? ' checked' : '') + '>' +
							'<span>' + RM.Components.escapeHtml(ref.label) + '</span></label></li>';
					}).join('') + '</ul></details>';
			}).join('') +
			'</div>';
	}

	function filterColumnPicker(query) {
		var normalized = String(query || '').trim().toLowerCase();
		document.querySelectorAll('#rb-column-picker-list .rb-column-option').forEach(function (row) {
			var haystack = row.getAttribute('data-search') || '';
			row.hidden = normalized ? haystack.indexOf(normalized) === -1 : false;
		});
		document.querySelectorAll('#rb-column-picker-list .rb-column-entity').forEach(function (group) {
			var visible = group.querySelector('.rb-column-option:not([hidden])');
			group.hidden = !visible;
		});
	}

	function restoreColumnSearch(renderFn) {
		var searchEl = document.getElementById('rb-column-search');
		var query = searchEl ? searchEl.value : '';
		renderFn();
		if (!query) { return; }
		var nextSearch = document.getElementById('rb-column-search');
		if (nextSearch) {
			nextSearch.value = query;
			filterColumnPicker(query);
		}
	}

	function renderFieldPalette() {
		var entityIds = chartEntitiesInScope();
		var refs = RM.ReportDataModel.paletteFieldRefs(state.primaryEntity, { reportableOnly: true });
		var dimensions = refs.filter(function (r) { return r.role === 'dimension'; });
		var measures = refs.filter(function (r) { return r.role === 'measure' && !r.isRelatedCount; });
		var relatedCounts = refs.filter(function (r) { return r.isRelatedCount; });

		function chip(ref) {
			return '<button type="button" class="rb-drag-field" draggable="true" data-field-key="' + ref.key +
				'" data-field-role="' + ref.role + '" title="' + RM.Components.escapeHtml(t('pages.reportBuilder.clickOrDrag')) + '">' +
				'<span class="rb-drag-handle" aria-hidden="true">⠿</span>' +
				'<span class="rb-drag-label">' + RM.Components.escapeHtml(ref.label) + '</span></button>';
		}

		function entityGroup(title, groupRefs) {
			if (!groupRefs.length) { return ''; }
			return '<div class="rb-palette-entity-group">' +
				'<h4 class="rb-palette-entity-label">' + RM.Components.escapeHtml(title) + '</h4>' +
				groupRefs.map(chip).join('') + '</div>';
		}

		function groupedSection(allRefs) {
			return entityIds.map(function (entityId) {
				var entityRefs = allRefs.filter(function (r) { return r.entity === entityId; });
				return entityGroup(RM.ReportDataModel.label(entityId), entityRefs);
			}).join('');
		}

		var dimensionHtml = groupedSection(dimensions);
		var measureHtml = groupedSection(measures);
		var relatedHtml = relatedCounts.length
			? '<div class="rb-palette-entity-group rb-palette-related-counts">' +
				'<h4 class="rb-palette-entity-label">' + RM.Components.escapeHtml(t('pages.reportBuilder.relatedCounts')) + '</h4>' +
				relatedCounts.map(chip).join('') + '</div>'
			: '';

		return '<div class="rb-palette-section">' +
			'<h3>' + RM.Components.escapeHtml(t('pages.reportBuilder.dimensions')) + '</h3>' +
			(dimensionHtml || '<p class="text-muted">' + RM.Components.escapeHtml(t('pages.reportBuilder.noDimensions')) + '</p>') +
			'</div><div class="rb-palette-section">' +
			'<h3>' + RM.Components.escapeHtml(t('pages.reportBuilder.measures')) + '</h3>' +
			'<button type="button" class="rb-drag-field rb-drag-field-special" draggable="true" data-field-key="__count__" data-field-role="measure" title="' +
			RM.Components.escapeHtml(t('pages.reportBuilder.clickOrDrag')) + '">' +
			'<span class="rb-drag-handle" aria-hidden="true">⠿</span>' +
			'<span class="rb-drag-label">' + RM.Components.escapeHtml(t('pages.reportBuilder.recordCount')) + '</span></button>' +
			relatedHtml + measureHtml +
			'</div>';
	}

	function renderAxisDropContent(axis) {
		if (axis === 'x') {
			if (!state.chart.xAxis) {
				return '<span class="rb-drop-placeholder">' + RM.Components.escapeHtml(t('pages.reportBuilder.dropX')) + '</span>';
			}
			return '<div class="rb-drop-chip">' +
				'<span>' + RM.Components.escapeHtml(RM.ReportDataModel.fieldDisplayLabel(state.chart.xAxis.entity, state.chart.xAxis.field)) + '</span>' +
				'<button type="button" class="rb-drop-clear" data-clear-axis="x" aria-label="' + RM.Components.escapeHtml(t('pages.reportBuilder.clearAxis')) + '">×</button></div>';
		}

		if (state.chart.yAxis && state.chart.yAxis.field) {
			return '<div class="rb-drop-chip' + (state.chart.yAxis.field === '__count' ? ' is-special' : '') + '">' +
				'<span>' + RM.Components.escapeHtml(RM.ReportDataModel.fieldDisplayLabel(state.chart.yAxis.entity, state.chart.yAxis.field)) + '</span>' +
				'<button type="button" class="rb-drop-clear" data-clear-axis="y" aria-label="' + RM.Components.escapeHtml(t('pages.reportBuilder.clearAxis')) + '">×</button></div>';
		}
		if (state.chart.yAxis && state.chart.yAxis.aggregate === 'count' && !state.chart.yAxis.field) {
			return '<div class="rb-drop-chip is-special">' +
				'<span>' + RM.Components.escapeHtml(t('pages.reportBuilder.recordCount')) + '</span>' +
				'<button type="button" class="rb-drop-clear" data-clear-axis="y" aria-label="' + RM.Components.escapeHtml(t('pages.reportBuilder.clearAxis')) + '">×</button></div>';
		}
		return '<span class="rb-drop-placeholder">' + RM.Components.escapeHtml(t('pages.reportBuilder.dropY')) + '</span>';
	}

	function renderChartGuide() {
		if (!state.chart.xAxis) {
			return '<p class="rb-guide-title">' + RM.Components.escapeHtml(t('pages.reportBuilder.guideStartTitle')) + '</p>' +
				'<p>' + RM.Components.escapeHtml(t('pages.reportBuilder.guideStartBody')) + '</p>';
		}
		if (!state.chart.yAxis || (!state.chart.yAxis.field && state.chart.yAxis.aggregate !== 'count')) {
			return '<p class="rb-guide-title">' + RM.Components.escapeHtml(t('pages.reportBuilder.guideYTitle')) + '</p>' +
				'<p>' + RM.Components.escapeHtml(t('pages.reportBuilder.guideYBody')) + '</p>';
		}
		var chartType = state.chart.chartType || RM.ReportBuilderEngine.suggestChartType(state.chart.xAxis, state.chart.yAxis);
		return '<p class="rb-guide-title">' + RM.Components.escapeHtml(t('pages.reportBuilder.guideReadyTitle')) + '</p>' +
			'<p>' + RM.Components.escapeHtml(t('pages.reportBuilder.guideReadyBody', {
				x: RM.ReportDataModel.fieldDisplayLabel(state.chart.xAxis.entity, state.chart.xAxis.field),
				y: state.chart.yAxis.field
					? RM.ReportDataModel.fieldDisplayLabel(state.chart.yAxis.entity, state.chart.yAxis.field)
					: t('pages.reportBuilder.recordCount'),
				type: t('pages.reportBuilder.chartTypes.' + chartType)
			})) + '</p>';
	}

	function chartHasMeasure() {
		return !!(state.chart.yAxis && state.chart.yAxis.field);
	}

	function isXAxisDateField() {
		if (!state.chart.xAxis) { return false; }
		var meta = RM.ReportDataModel.fieldMeta(state.chart.xAxis.entity, state.chart.xAxis.field);
		return !!(meta && meta.type === 'date');
	}

	function normalizeChartAggregate() {
		if (!state.chart.yAxis) {
			state.chart.yAxis = { aggregate: 'count', cumulative: false };
		}
		if (RM.ReportBuilderEngine.aggregateNeedsMeasure(state.chart.yAxis.aggregate) && !chartHasMeasure()) {
			state.chart.yAxis.aggregate = 'count';
		}
		if (state.chart.yAxis.cumulative &&
			!RM.ReportBuilderEngine.aggregateSupportsCumulative(state.chart.yAxis.aggregate)) {
			state.chart.yAxis.cumulative = false;
		}
		if (!isXAxisDateField()) {
			state.chart.xGrouping = 'none';
		}
	}

	function renderChartOptions() {
		normalizeChartAggregate();
		var types = ['bar', 'line', 'donut'];
		var aggregates = RM.ReportBuilderEngine.aggregateDefinitions().map(function (item) { return item.id; });
		var currentType = state.chart.chartType || 'bar';
		var currentAgg = (state.chart.yAxis && state.chart.yAxis.aggregate) || 'count';
		var cumulative = !!(state.chart.yAxis && state.chart.yAxis.cumulative);
		var hasMeasure = chartHasMeasure();
		var canCumulative = RM.ReportBuilderEngine.aggregateSupportsCumulative(currentAgg);
		var xGrouping = state.chart.xGrouping || 'none';

		var aggregateHtml = aggregates.map(function (agg) {
			var disabled = RM.ReportBuilderEngine.aggregateNeedsMeasure(agg) && !hasMeasure;
			return '<button type="button" class="rb-segment-btn rb-aggregate-btn' + (currentAgg === agg ? ' is-active' : '') +
				(disabled ? ' is-disabled' : '') + '" data-aggregate="' + agg + '"' +
				(disabled ? ' disabled aria-disabled="true"' : '') + '>' +
				RM.Components.escapeHtml(t('pages.reportBuilder.aggregates.' + agg)) + '</button>';
		}).join('');

		var cumulativeHtml = '<label class="rb-cumulative-toggle">' +
			'<input type="checkbox" id="rb-cumulative"' + (cumulative ? ' checked' : '') +
			(canCumulative ? '' : ' disabled') + '>' +
			'<span>' + RM.Components.escapeHtml(t('pages.reportBuilder.cumulativeToggle')) + '</span></label>' +
			(canCumulative ? '' : '<p class="text-muted rb-aggregate-hint">' +
				RM.Components.escapeHtml(t('pages.reportBuilder.cumulativeHint')) + '</p>');

		var xGroupingHtml = isXAxisDateField()
			? '<div class="form-group"><span class="form-label">' + RM.Components.escapeHtml(t('pages.reportBuilder.xGroupingLabel')) + '</span>' +
				'<div class="rb-segment-row">' + ['none', 'month', 'year'].map(function (grouping) {
					return '<button type="button" class="rb-segment-btn rb-x-grouping-btn' +
						(xGrouping === grouping ? ' is-active' : '') + '" data-x-grouping="' + grouping + '">' +
						RM.Components.escapeHtml(t('pages.reportBuilder.xGrouping.' + grouping)) + '</button>';
				}).join('') + '</div>' +
				'<p class="text-muted rb-aggregate-hint">' + RM.Components.escapeHtml(t('pages.reportBuilder.xGroupingHint')) + '</p></div>'
			: '';

		return '<div class="form-group"><span class="form-label">' + RM.Components.escapeHtml(t('pages.reportBuilder.chartType')) + '</span>' +
			'<div class="rb-segment-row">' + types.map(function (type) {
				return '<button type="button" class="rb-segment-btn rb-chart-type-btn' + (currentType === type ? ' is-active' : '') +
					'" data-chart-type="' + type + '">' + RM.Components.escapeHtml(t('pages.reportBuilder.chartTypes.' + type)) + '</button>';
			}).join('') + '</div></div>' +
			'<div class="form-group"><span class="form-label">' + RM.Components.escapeHtml(t('pages.reportBuilder.aggregate')) + '</span>' +
			(hasMeasure ? '' : '<p class="text-muted rb-aggregate-hint">' + RM.Components.escapeHtml(t('pages.reportBuilder.aggregateCountOnly')) + '</p>') +
			'<div class="rb-segment-row rb-segment-row-wrap">' + aggregateHtml + '</div>' +
			cumulativeHtml + '</div>' +
			xGroupingHtml;
	}

	function filterOperatorOptions(selected) {
		return ['eq', 'neq', 'contains', 'notEmpty', 'empty', 'true', 'false'].map(function (op) {
			return '<option value="' + op + '"' + (selected === op ? ' selected' : '') + '>' +
				RM.Components.escapeHtml(t('pages.reportBuilder.ops.' + op)) + '</option>';
		}).join('');
	}

	function renderFilters() {
		if (!state.filters.length) {
			return '<p class="text-muted">' + RM.Components.escapeHtml(t('pages.reportBuilder.noFilters')) + '</p>';
		}
		return state.filters.map(function (filter, index) {
			var entityOptions = entitiesInScope().map(function (entityId) {
				return '<option value="' + entityId + '"' + (filter.entity === entityId ? ' selected' : '') + '>' +
					RM.Components.escapeHtml(RM.ReportDataModel.label(entityId)) + '</option>';
			}).join('');
			var entity = RM.ReportDataModel.getEntity(filter.entity);
			var fieldOptions = (entity ? entity.fields : []).filter(function (field) {
				return RM.ReportDataModel.isReportableField(filter.entity, field.id);
			}).map(function (field) {
				return '<option value="' + field.id + '"' + (filter.field === field.id ? ' selected' : '') + '>' +
					RM.Components.escapeHtml(RM.ReportDataModel.fieldLabel(filter.entity, field.id)) + '</option>';
			}).join('');
			return '<div class="report-builder-filter-row" data-filter-index="' + index + '">' +
				'<select data-filter-part="entity">' + entityOptions + '</select>' +
				'<select data-filter-part="field">' + fieldOptions + '</select>' +
				'<select data-filter-part="op">' + filterOperatorOptions(filter.op) + '</select>' +
				'<input type="text" data-filter-part="value" value="' + RM.Components.escapeHtml(filter.value || '') + '">' +
				'<button type="button" class="btn btn-secondary btn-sm" data-filter-remove="' + index + '">×</button></div>';
		}).join('');
	}

	function entitiesInScope() {
		return RM.ReportDataModel.reachableEntityIds(state.primaryEntity);
	}

	function chartEntitiesInScope() {
		return RM.ReportDataModel.reachableEntityIds(state.primaryEntity);
	}

	function syncJoinsFromState() {
		var synced = RM.ReportDataModel.syncJoinsFromReportConfig(currentConfig());
		state.joins = synced.joins;
		state.joinAggregates = synced.joinAggregates;
	}

	function applyCatalogItem(item) {
		readFormState();
		state.id = null;
		state.name = t(item.labelKey);
		state.reportType = item.reportType || 'table';
		state.primaryEntity = item.primaryEntity;
		state.joins = (item.joins || []).slice();
		state.columns = (item.columns || []).slice();
		state.filters = (item.filters || []).slice();
		state.joinAggregates = Object.assign({ riskAssessment: 'latest' }, item.joinAggregates || {});
		state.chart = item.chart
			? JSON.parse(JSON.stringify(item.chart))
			: { xAxis: null, yAxis: { aggregate: 'count', cumulative: false }, xGrouping: 'none', chartType: 'bar' };
		syncJoinsFromState();
	}

	function applyDefaultTableConfig() {
		state.primaryEntity = 'client';
		state.joins = [];
		state.columns = defaultColumnsForEntity('client');
		state.filters = [];
		state.joinAggregates = { riskAssessment: 'latest' };
		state.sortBy = { entity: 'client', field: 'name', dir: 'asc' };
		syncJoinsFromState();
	}

	function applyDefaultChartConfig() {
		state.primaryEntity = 'client';
		state.joins = [];
		state.columns = [];
		state.filters = [];
		state.joinAggregates = { riskAssessment: 'latest' };
		state.chart = { xAxis: null, yAxis: { aggregate: 'count', cumulative: false }, xGrouping: 'none', chartType: 'bar' };
		syncJoinsFromState();
	}

	function getTemplateFromUrl() {
		var match = /[?&]template=([^&]+)/.exec(window.location.search);
		return match ? decodeURIComponent(match[1]) : null;
	}

	function applyTemplateFromUrl() {
		var templateId = getTemplateFromUrl();
		if (!templateId || !RM.ReportCatalog) { return false; }
		var item = RM.ReportCatalog.findById(templateId);
		if (!item) { return false; }
		applyCatalogItem(item);
		return true;
	}

	function resetToNewReport() {
		readFormState();
		state.id = null;
		state.name = '';
		state.lastResult = null;
		state.lastChartResult = null;
		if (state.reportType === 'chart') {
			applyDefaultChartConfig();
		} else {
			applyDefaultTableConfig();
		}
		renderPage();
		runPreview(false);
	}

	function applyFieldToAxis(axis, fieldKey, role) {
		if (fieldKey === '__count__') {
			state.chart.yAxis = { aggregate: 'count', cumulative: false };
			syncChartJoins();
			return;
		}
		var ref = RM.ReportDataModel.parseFieldRef(fieldKey);
		if (axis === 'x') {
			if (role === 'measure') {
				RM.Components.showToast(t('pages.reportBuilder.xMustBeDimension'), 'warning');
				return;
			}
			state.chart.xAxis = { entity: ref.entity, field: ref.field };
		} else {
			state.chart.yAxis = {
				entity: ref.entity,
				field: ref.field,
				aggregate: RM.ReportBuilderEngine.suggestAggregate({ entity: ref.entity, field: ref.field })
			};
		}
		syncChartJoins();
		state.chart.chartType = RM.ReportBuilderEngine.suggestChartType(state.chart.xAxis, state.chart.yAxis);
	}

	function syncChartJoins() {
		syncJoinsFromState();
	}

	function readFormState() {
		var nameEl = document.getElementById('rb-name');
		if (nameEl) { state.name = nameEl.value.trim(); }
		readFiltersFromDom();
	}

	function readFiltersFromDom() {
		var rows = document.querySelectorAll('.report-builder-filter-row');
		if (!rows.length) { return; }
		state.filters = [];
		rows.forEach(function (row) {
			state.filters.push({
				entity: row.querySelector('[data-filter-part="entity"]').value,
				field: row.querySelector('[data-filter-part="field"]').value,
				op: row.querySelector('[data-filter-part="op"]').value,
				value: row.querySelector('[data-filter-part="value"]').value
			});
		});
	}

	function currentConfig() {
		return {
			id: state.id,
			name: state.name,
			reportType: state.reportType,
			primaryEntity: state.primaryEntity,
			joins: state.joins.slice(),
			columns: state.columns.slice(),
			filters: state.filters.slice(),
			sortBy: state.sortBy,
			joinAggregates: state.joinAggregates,
			chart: JSON.parse(JSON.stringify(state.chart))
		};
	}

	function applyConfig(config) {
		state.id = config.id || null;
		state.name = config.name || '';
		state.reportType = config.reportType || 'table';
		state.primaryEntity = config.primaryEntity || 'client';
		state.joins = (config.joins || []).slice();
		state.columns = (config.columns || []).slice();
		state.filters = (config.filters || []).slice();
		state.joinAggregates = Object.assign({ riskAssessment: 'latest' }, config.joinAggregates || {});
		state.chart = config.chart || { xAxis: null, yAxis: { aggregate: 'count', cumulative: false }, xGrouping: 'none', chartType: 'bar' };
		if (!state.chart.yAxis) {
			state.chart.yAxis = { aggregate: 'count', cumulative: false };
		}
		if (state.chart.yAxis.cumulative == null) { state.chart.yAxis.cumulative = false; }
		if (!state.chart.xGrouping) { state.chart.xGrouping = 'none'; }
		if (state.chart.chartType === 'pie') { state.chart.chartType = 'donut'; }
		syncJoinsFromState();
	}

	function runPreview(scrollToPreview) {
		readFormState();
		syncJoinsFromState();
		var user = RM.Session.getCurrentUser();
		var metaEl = document.getElementById('rb-preview-meta');
		var container = document.getElementById('rb-preview');

		if (state.reportType === 'chart') {
			state.lastChartResult = RM.ReportBuilderEngine.runChart(currentConfig(), user);
			renderChartPreview(container, state.lastChartResult);
			if (metaEl && state.lastChartResult.points) {
				metaEl.textContent = t('pages.reportBuilder.chartMeta', {
					groups: state.lastChartResult.points.length,
					rows: state.lastChartResult.meta ? state.lastChartResult.meta.rowCount : 0
				});
			}
		} else {
			if (!state.columns.length) {
				state.columns = defaultColumnsForEntity(state.primaryEntity);
			}
			state.lastResult = RM.ReportBuilderEngine.run(currentConfig(), user);
			renderTablePreview(container, state.lastResult);
			if (metaEl && state.lastResult.rows) {
				metaEl.textContent = t('pages.reportBuilder.rowCount', { count: state.lastResult.rows.length });
			}
		}

		if (scrollToPreview && container) {
			container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
		}
	}

	function renderTablePreview(container, result) {
		if (!container) { return; }
		if (!result || !result.rows.length) {
			container.innerHTML = RM.Components.emptyState(t('pages.reportBuilder.noPreview'), t('pages.reportBuilder.noPreviewHint'));
			return;
		}
		container.innerHTML = '<div class="rb-table-wrap"><table class="data-table"><thead><tr>' +
			result.columns.map(function (col) {
				return '<th>' + RM.Components.escapeHtml(col.label) + '</th>';
			}).join('') + '</tr></thead><tbody>' +
			result.rows.map(function (row) {
				return '<tr>' + result.columns.map(function (col) {
					return '<td>' + RM.Components.escapeHtml(row[col.key] == null ? '' : String(row[col.key])) + '</td>';
				}).join('') + '</tr>';
			}).join('') + '</tbody></table></div>';
	}

	function renderChartPreview(container, result) {
		if (!container) { return; }
		if (!result || result.error === 'missing_x' || !result.points || !result.points.length) {
			container.innerHTML = RM.Components.emptyState(
				t('pages.reportBuilder.noChartPreview'),
				t('pages.reportBuilder.noChartPreviewHint')
			);
			return;
		}

		var max = Math.max.apply(null, result.points.map(function (p) { return p.value; }).concat([1]));

		if (result.chartType === 'donut') {
			container.innerHTML = '<div id="rb-chart-preview-visual">' + renderRadialChartPreview(result) + '</div>';
			return;
		}

		if (result.chartType === 'line') {
			container.innerHTML = '<div id="rb-chart-preview-visual">' + renderLineChartPreview(result) + '</div>';
			return;
		}

		var bars = result.points.map(function (point, index) {
			var pct = Math.round((point.value / max) * 100);
			var color = point.color || CHART_COLORS[index % CHART_COLORS.length];
			return '<div class="rb-chart-bar-row">' +
				'<div class="rb-chart-bar-label">' + RM.Components.escapeHtml(point.label) + '</div>' +
				'<div class="rb-chart-bar-track"><div class="rb-chart-bar-fill" style="width:' + Math.max(pct, 2) +
				'%;background:' + color + '"></div></div>' +
				'<div class="rb-chart-bar-value">' + point.value + '</div></div>';
		}).join('');

		container.innerHTML = '<div id="rb-chart-preview-visual"><div class="rb-chart-preview-head">' +
			'<strong>' + RM.Components.escapeHtml(result.yLabel) + '</strong>' +
			'<span class="text-muted">' + RM.Components.escapeHtml(t('pages.reportBuilder.by')) + ' ' +
			RM.Components.escapeHtml(result.xLabel) + '</span></div>' +
			'<div class="rb-chart-bars" id="rb-chart-preview-bars">' +
			bars + '</div></div>';
	}

	function renderLineChartPreview(result) {
		var points = result.points || [];
		var width = 520;
		var height = 240;
		var pad = { top: 18, right: 20, bottom: 52, left: 52 };
		var plotW = width - pad.left - pad.right;
		var plotH = height - pad.top - pad.bottom;
		var max = Math.max.apply(null, points.map(function (p) { return p.value; }).concat([1]));
		var color = '#2563eb';

		function xAt(index) {
			if (points.length === 1) { return pad.left + plotW / 2; }
			return pad.left + (index / (points.length - 1)) * plotW;
		}

		function yAt(value) {
			return pad.top + plotH - (value / max) * plotH;
		}

		var coords = points.map(function (point, index) {
			return { x: xAt(index), y: yAt(point.value), point: point };
		});

		var polyline = coords.map(function (coord) {
			return coord.x.toFixed(1) + ',' + coord.y.toFixed(1);
		}).join(' ');

		var gridLines = [0, 0.25, 0.5, 0.75, 1].map(function (tick) {
			var y = pad.top + plotH * (1 - tick);
			var value = Math.round(max * tick);
			return '<line class="rb-line-grid" x1="' + pad.left + '" y1="' + y.toFixed(1) +
				'" x2="' + (width - pad.right) + '" y2="' + y.toFixed(1) + '"></line>' +
				'<text class="rb-line-axis-label" x="' + (pad.left - 8) + '" y="' + (y + 4).toFixed(1) +
				'" text-anchor="end">' + value + '</text>';
		}).join('');

		var dots = coords.map(function (coord, index) {
			return '<circle class="rb-line-dot" cx="' + coord.x.toFixed(1) + '" cy="' + coord.y.toFixed(1) +
				'" r="4.5" fill="' + color + '" stroke="#fff" stroke-width="2">' +
				'<title>' + RM.Components.escapeHtml(coord.point.label + ': ' + coord.point.value) + '</title></circle>' +
				'<text class="rb-line-x-label" x="' + coord.x.toFixed(1) + '" y="' + (height - 18) +
				'" text-anchor="middle">' + RM.Components.escapeHtml(truncateLabel(coord.point.label, 12)) + '</text>' +
				'<text class="rb-line-value-label" x="' + coord.x.toFixed(1) + '" y="' + (coord.y - 10).toFixed(1) +
				'" text-anchor="middle">' + coord.point.value + '</text>';
		}).join('');

		return '<div class="rb-chart-preview-head">' +
			'<strong>' + RM.Components.escapeHtml(result.yLabel) + '</strong>' +
			'<span class="text-muted">' + RM.Components.escapeHtml(t('pages.reportBuilder.by')) + ' ' +
			RM.Components.escapeHtml(result.xLabel) + '</span></div>' +
			'<div class="rb-line-chart-wrap">' +
			'<svg class="rb-line-chart" viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="' +
			RM.Components.escapeHtml(result.yLabel + ' by ' + result.xLabel) + '">' +
			gridLines +
			'<polyline class="rb-line-path" fill="none" stroke="' + color + '" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="' +
			polyline + '"></polyline>' +
			dots +
			'</svg></div>';
	}

	function truncateLabel(label, maxLen) {
		label = String(label == null ? '' : label);
		return label.length > maxLen ? label.slice(0, maxLen - 1) + '…' : label;
	}

	function renderRadialChartPreview(result) {
		var total = result.points.reduce(function (sum, p) { return sum + p.value; }, 0) || 1;
		var offset = 0;
		var segments = result.points.map(function (point, index) {
			var pct = (point.value / total) * 100;
			var color = point.color || CHART_COLORS[index % CHART_COLORS.length];
			var seg = color + ' ' + offset + '% ' + (offset + pct) + '%';
			offset += pct;
			return seg;
		}).join(', ');

		var legend = result.points.map(function (point, index) {
			var pct = Math.round((point.value / total) * 100);
			return '<li><span class="rb-legend-swatch" style="background:' +
				(point.color || CHART_COLORS[index % CHART_COLORS.length]) + '"></span>' +
				RM.Components.escapeHtml(point.label) + ' — ' + point.value +
				' <span class="rb-legend-pct">(' + pct + '%)</span></li>';
		}).join('');

		return '<div class="rb-chart-preview-head">' +
			'<strong>' + RM.Components.escapeHtml(result.yLabel) + '</strong>' +
			'<span class="text-muted">' + RM.Components.escapeHtml(t('pages.reportBuilder.by')) + ' ' +
			RM.Components.escapeHtml(result.xLabel) + '</span></div>' +
			'<div class="rb-radial-wrap is-donut">' +
			'<div class="rb-donut" style="background:conic-gradient(' + segments + ')">' +
			'<div class="rb-donut-hole"><span class="rb-donut-total">' + total + '</span></div></div>' +
			'<ul class="rb-radial-legend">' + legend + '</ul></div>';
	}

	function saveReport() {
		readFormState();
		if (!state.name) {
			RM.Components.showToast(t('pages.reportBuilder.nameRequired'), 'warning');
			return;
		}
		var user = RM.Session.getCurrentUser();
		var payload = Object.assign({}, currentConfig(), {
			id: state.id || ('cr-' + Date.now()),
			ownerId: user ? user.id : null,
			shared: true,
			updatedAt: new Date().toISOString()
		});
		RM.CustomReportRepository.save(payload);
		state.id = payload.id;
		RM.Audit.record('customReport:' + payload.id, 'export_report', 'Saved custom report: ' + payload.name);
		RM.Components.showToast(t('pages.reportBuilder.saved'), 'success');
		populateSavedReports();
	}

	function exportReport() {
		readFormState();
		runPreview(false);
		if (state.reportType === 'chart') {
			exportChart();
			return;
		}
		var result = state.lastResult;
		if (!result || !result.rows.length) {
			RM.Components.showToast(t('pages.reportBuilder.noDataExport'), 'warning');
			return;
		}
		RM.Components.exportXlsx(
			(state.name || 'custom-report') + '.xlsx',
			result.rows,
			result.columns.map(function (col) { return { key: col.key, label: col.label }; }),
			{ title: state.name || t('pages.reportBuilder.preview'), sheetName: t('pages.reportBuilder.sheetName') }
		);
	}

	function exportChart() {
		var result = state.lastChartResult;
		if (!result || !result.points || !result.points.length) {
			RM.Components.showToast(t('pages.reportBuilder.noDataExport'), 'warning');
			return;
		}
		var rows = result.points.map(function (p) {
			return { label: p.label, value: p.value };
		});
		RM.Components.exportXlsx(
			(state.name || 'custom-chart') + '.xlsx',
			rows,
			[
				{ key: 'label', label: result.xLabel },
				{ key: 'value', label: result.yLabel }
			],
			{ title: state.name || t('pages.reportBuilder.preview'), sheetName: t('pages.reportBuilder.sheetName') }
		);
		var visualEl = document.getElementById('rb-chart-preview-visual');
		if (visualEl) {
			RM.Components.exportElementAsPng(visualEl, (state.name || 'chart') + '.png');
		}
	}

	function populateSavedReports() {
		var select = document.getElementById('rb-saved');
		if (!select) { return; }
		var user = RM.Session.getCurrentUser();
		var current = select.value;
		select.innerHTML = '<option value="">' + RM.Components.escapeHtml(t('pages.reportBuilder.newReport')) + '</option>';
		RM.CustomReportRepository.findByOwner(user ? user.id : null).forEach(function (report) {
			var opt = document.createElement('option');
			opt.value = report.id;
			opt.textContent = report.name + (report.reportType === 'chart' ? ' 📊' : '');
			if (state.id === report.id || current === report.id) { opt.selected = true; }
			select.appendChild(opt);
		});
	}

	function wireDragAndDrop(root) {
		root.querySelectorAll('.rb-drag-field').forEach(function (el) {
			el.addEventListener('dragstart', function (e) {
				state.dragField = {
					key: el.getAttribute('data-field-key'),
					role: el.getAttribute('data-field-role')
				};
				el.classList.add('is-dragging');
				if (e.dataTransfer) {
					e.dataTransfer.setData('text/plain', state.dragField.key);
					e.dataTransfer.effectAllowed = 'move';
				}
			});
			el.addEventListener('dragend', function () {
				el.classList.remove('is-dragging');
				root.querySelectorAll('.rb-axis-drop').forEach(function (zone) {
					zone.classList.remove('is-dragover');
				});
			});
		});

		root.querySelectorAll('.rb-axis-drop').forEach(function (zone) {
			zone.addEventListener('dragover', function (e) {
				e.preventDefault();
				zone.classList.add('is-dragover');
			});
			zone.addEventListener('dragleave', function () {
				zone.classList.remove('is-dragover');
			});
			zone.addEventListener('drop', function (e) {
				e.preventDefault();
				zone.classList.remove('is-dragover');
				var key = state.dragField ? state.dragField.key : (e.dataTransfer && e.dataTransfer.getData('text/plain'));
				var role = state.dragField ? state.dragField.role : 'dimension';
				if (!key) { return; }
				assignFieldToAxis(zone.getAttribute('data-axis'), key, role);
			});
		});
	}

	function assignFieldToAxis(axis, fieldKey, role) {
		readFormState();
		if (axis === 'y' && fieldKey === '__count__') {
			applyFieldToAxis('y', fieldKey, role);
			renderPage();
			runPreview(true);
			return;
		}
		if (axis === 'x' && role === 'measure') {
			RM.Components.showToast(t('pages.reportBuilder.xMustBeDimension'), 'warning');
			return;
		}
		if (axis === 'x' && role !== 'measure') {
			applyFieldToAxis('x', fieldKey, role);
			renderPage();
			runPreview(true);
			return;
		}
		if (axis === 'y') {
			applyFieldToAxis('y', fieldKey, role);
			renderPage();
			runPreview(true);
		}
	}

	function handlePaletteFieldClick(fieldEl) {
		var key = fieldEl.getAttribute('data-field-key');
		var role = fieldEl.getAttribute('data-field-role');
		if (!state.chart.xAxis && role === 'dimension') {
			assignFieldToAxis('x', key, role);
			return;
		}
		if (role === 'measure' || key === '__count__') {
			assignFieldToAxis('y', key, role);
			return;
		}
		if (!isYAxisFilled()) {
			assignFieldToAxis('y', '__count__', 'measure');
			return;
		}
		RM.Components.showToast(t('pages.reportBuilder.axisAlreadySet'), 'info');
	}

	function wireEvents(main) {
		main.addEventListener('click', function (e) {
			var typeBtn = e.target.closest('.rb-type-btn');
			if (typeBtn) {
				readFormState();
				state.reportType = typeBtn.getAttribute('data-report-type');
				renderPage();
				return;
			}

			var entityChip = e.target.closest('.rb-entity-chip');
			if (entityChip) {
				readFormState();
				state.primaryEntity = entityChip.getAttribute('data-entity');
				state.joins = [];
				state.joinAggregates = { riskAssessment: 'latest' };
				if (state.reportType === 'table') {
					state.columns = defaultColumnsForEntity(state.primaryEntity);
				} else {
					state.chart.xAxis = null;
					state.chart.yAxis = { aggregate: 'count', cumulative: false };
				}
				state.filters = [];
				renderPage();
				return;
			}

			var columnCheckbox = e.target.closest('.rb-column-checkbox');
			if (columnCheckbox) {
				readFormState();
				var col = {
					entity: columnCheckbox.getAttribute('data-column-entity'),
					field: columnCheckbox.getAttribute('data-column-field')
				};
				var idx = state.columns.findIndex(function (c) {
					return c.entity === col.entity && c.field === col.field;
				});
				if (columnCheckbox.checked && idx === -1) {
					state.columns.push(col);
				} else if (!columnCheckbox.checked && idx !== -1) {
					state.columns.splice(idx, 1);
				}
				syncJoinsFromState();
				restoreColumnSearch(renderPage);
				return;
			}

			var removeColumnBtn = e.target.closest('.rb-column-remove');
			if (removeColumnBtn) {
				readFormState();
				state.columns.splice(parseInt(removeColumnBtn.getAttribute('data-column-index'), 10), 1);
				syncJoinsFromState();
				restoreColumnSearch(renderPage);
				return;
			}

			if (e.target.closest('#rb-advanced-toggle')) {
				readFormState();
				state.showAdvanced = !state.showAdvanced;
				renderPage();
				return;
			}

			var joinPill = e.target.closest('#rb-joins .rb-pill');
			if (joinPill) {
				readFormState();
				var join = joinPill.getAttribute('data-join');
				var joinIdx = state.joins.indexOf(join);
				if (joinIdx === -1) { state.joins.push(join); } else { state.joins.splice(joinIdx, 1); }
				renderPage();
				return;
			}

			var removeBtn = e.target.closest('[data-filter-remove]');
			if (removeBtn) {
				readFormState();
				state.filters.splice(parseInt(removeBtn.getAttribute('data-filter-remove'), 10), 1);
				renderPage();
				return;
			}

			var chartTypeBtn = e.target.closest('.rb-chart-type-btn');
			if (chartTypeBtn) {
				readFormState();
				state.chart.chartType = chartTypeBtn.getAttribute('data-chart-type');
				renderPage();
				return;
			}

			var aggregateBtn = e.target.closest('.rb-aggregate-btn');
			if (aggregateBtn) {
				if (aggregateBtn.disabled || aggregateBtn.classList.contains('is-disabled')) {
					RM.Components.showToast(t('pages.reportBuilder.aggregateRequiresMeasure'), 'info');
					return;
				}
				readFormState();
				state.chart.yAxis = state.chart.yAxis || {};
				state.chart.yAxis.aggregate = aggregateBtn.getAttribute('data-aggregate');
				if (!RM.ReportBuilderEngine.aggregateSupportsCumulative(state.chart.yAxis.aggregate)) {
					state.chart.yAxis.cumulative = false;
				}
				if (state.chart.yAxis.cumulative && state.chart.chartType === 'donut') {
					state.chart.chartType = 'line';
				}
				renderPage();
				return;
			}

			var xGroupingBtn = e.target.closest('.rb-x-grouping-btn');
			if (xGroupingBtn) {
				readFormState();
				state.chart.xGrouping = xGroupingBtn.getAttribute('data-x-grouping');
				renderPage();
				return;
			}

			var clearAxisBtn = e.target.closest('[data-clear-axis]');
			if (clearAxisBtn) {
				e.stopPropagation();
				readFormState();
				var axis = clearAxisBtn.getAttribute('data-clear-axis');
				if (axis === 'x') { state.chart.xAxis = null; }
				else { state.chart.yAxis = { aggregate: 'count', cumulative: false }; }
				renderPage();
				return;
			}

			var dragField = e.target.closest('.rb-drag-field');
			if (dragField) {
				handlePaletteFieldClick(dragField);
				return;
			}

			if (e.target.closest('#rb-add-filter')) {
				readFormState();
				var entityDef = RM.ReportDataModel.getEntity(state.primaryEntity);
				state.filters.push({
					entity: state.primaryEntity,
					field: entityDef && entityDef.fields[0] ? entityDef.fields[0].id : 'id',
					op: 'eq',
					value: ''
				});
				state.showAdvanced = true;
				renderPage();
				return;
			}

			if (e.target.closest('#rb-run')) {
				runPreview(true);
				return;
			}
			if (e.target.closest('#rb-save')) {
				saveReport();
				return;
			}
			if (e.target.closest('#rb-export')) {
				exportReport();
				return;
			}
			if (e.target.closest('#rb-new')) {
				resetToNewReport();
			}
		});

		main.addEventListener('input', function (e) {
			if (e.target.id === 'rb-column-search') {
				filterColumnPicker(e.target.value);
			}
		});

		main.addEventListener('change', function (e) {
			if (e.target.id === 'rb-cumulative') {
				readFormState();
				state.chart.yAxis = state.chart.yAxis || { aggregate: 'count' };
				state.chart.yAxis.cumulative = e.target.checked;
				if (state.chart.yAxis.cumulative && state.chart.chartType === 'donut') {
					state.chart.chartType = 'line';
				}
				renderPage();
				return;
			}

			if (e.target.id === 'rb-saved') {
				var id = e.target.value;
				if (!id) {
					resetToNewReport();
					return;
				}
				var saved = RM.CustomReportRepository.findById(id);
				if (saved) {
					applyConfig(saved);
					renderPage();
				}
				return;
			}

			var filterPart = e.target.getAttribute('data-filter-part');
			if (filterPart) {
				readFiltersFromDom();
				if (filterPart === 'entity') {
					var row = e.target.closest('.report-builder-filter-row');
					if (row) {
						var rowIdx = parseInt(row.getAttribute('data-filter-index'), 10);
						var entity = RM.ReportDataModel.getEntity(state.filters[rowIdx].entity);
						if (entity && entity.fields[0]) {
							state.filters[rowIdx].field = entity.fields[0].id;
						}
						renderPage();
						return;
					}
				}
				runPreview(false);
			}
		});

		main.addEventListener('input', function (e) {
			if (e.target.matches('[data-filter-part="value"]') || e.target.id === 'rb-name') {
				if (e.target.id === 'rb-name') { return; }
				runPreview(false);
			}
		});
	}
})();
