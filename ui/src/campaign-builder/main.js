/*
 * Copyright (C) 2022 Xibo Signage Ltd
 *
 * Xibo - Digital Signage - http://www.xibo.org.uk
 *
 * This file is part of Xibo.
 *
 * Xibo is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * any later version.
 *
 * Xibo is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with Xibo.  If not, see <http://www.gnu.org/licenses/>.
 */

// Include public path for webpack
require('../../public_path');
require('../style/campaign-builder.scss');

// Campaign builder name space
window.cB = {
  $container: null,
  $layoutSelect: null,
  templateLayoutAddForm: null,
  layoutAssignments: null,
  map: null,

  initialise: function($container) {
    this.$container = $container;
  },

  initialiseMap: function(containerSelector) {
    if (this.map !== null) {
      this.map.remove();
    }

    const $containerSelector = $('#' + containerSelector);

    this.map = L.map(containerSelector).setView(
      [
        this.getDataProperty($containerSelector, 'mapLat', '51'),
        this.getDataProperty($containerSelector, 'mapLong', '0.4'),
      ],
      this.getDataProperty($containerSelector, 'mapZoom', 13),
    );

    L.tileLayer(this.getDataProperty($containerSelector, 'mapTileServer'), {
      attribution: this.getDataProperty(
        $containerSelector,
        'mapAttribution',
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      ),
      subdomains: ['a', 'b', 'c'],
    }).addTo(this.map);
  },

  getDataProperty: function($element, property, defaultValue = null) {
    const value = $element.data(property);
    if (value) {
      return value;
    } else {
      return defaultValue;
    }
  },

  initaliseDisplaySelect: function($selector) {
    $selector.select2({
      ajax: {
        url: $selector.data('searchUrl'),
        dataType: 'json',
        data: function(params) {
          const query = {
            isDisplaySpecific: -1,
            forSchedule: 1,
            displayGroup: params.term,
            start: 0,
            length: 10,
            columns: [
              {
                data: 'isDisplaySpecific',
              },
              {
                data: 'displayGroup',
              },
            ],
            order: [
              {
                column: 0,
                dir: 'asc',
              },
              {
                column: 1,
                dir: 'asc',
              },
            ],
          };

          // Set the start parameter based on the page number
          if (params.page != null) {
            query.start = (params.page - 1) * 10;
          }

          return query;
        },
        processResults: function(data, params) {
          const groups = [];
          const displays = [];

          $.each(data.data, function(index, element) {
            if (element.isDisplaySpecific === 1) {
              displays.push({
                id: element.displayGroupId,
                text: element.displayGroup,
              });
            } else {
              groups.push({
                id: element.displayGroupId,
                text: element.displayGroup,
              });
            }
          });

          let page = params.page || 1;
          page = (page > 1) ? page - 1 : page;

          return {
            results: [
              {
                text: $selector.data('transGroups'),
                children: groups,
              }, {
                text: $selector.data('transDisplay'),
                children: displays,
              },
            ],
            pagination: {
              more: (page * 10 < data.recordsTotal),
            },
          };
        },
      },
    });
  },

  initialiseLayoutSelect: function($selector) {
    this.$layoutSelect = $selector;
    makePagedSelect($selector);
    $selector.on('select2:select', function(e) {
      if (!e.params.data) {
        return;
      }
      cB.openLayoutForm({
        layoutId: e.params.data.id,
        daysOfWeek: '1,2,3,4,5,6,7',
      }, campaignBuilderTrans.addLayoutFormTitle);
    });
  },

  openLayoutForm: function(layout, title) {
    if (this.templateLayoutAddForm === null) {
      this.templateLayoutAddForm =
        Handlebars.compile(
          $('#campaign-builder-layout-add-form-template').html(),
        );
    }

    // Open a modal
    const formHtml = this.templateLayoutAddForm(layout);
    const $dialog = bootbox.dialog({
      title: title,
      message: formHtml,
      size: 'large',
      buttons: {
        cancel: {
          label: campaignBuilderTrans.cancelButton,
          className: 'btn-white',
          callback: () => {
            // eslint-disable-next-line new-cap
            XiboDialogClose();
          },
        },
        add: {
          label: campaignBuilderTrans.saveButton,
          className: 'btn-primary save-button',
          callback: function() {
            $dialog.find('.XiboForm').submit();
            return false;
          },
        },
      },
    }).on('shown.bs.modal', function() {
      // Modal open
      const $form = $dialog.find('.XiboForm');

      // Init fields
      const $daysOfWeek = $dialog.find('select[name="daysOfWeek[]"]');
      $.each(layout.daysOfWeek.split(','), function(index, element) {
        $daysOfWeek.find('option[value=' + element + ']')
          .attr('selected', 'selected');
      });

      $daysOfWeek.select2({width: '100%'}).val();

      const $dayPartId = $dialog.find('select[name="dayPartId"]');
      if (layout.dayPartId) {
        $dayPartId.data('initial-value', layout.dayPartId);
      }
      makePagedSelect($dayPartId);

      // Load a map
      cB.initialiseMap('campaign-builder-map');

      $dialog.find('.XiboForm').validate({
        submitHandler: function(form) {
          // eslint-disable-next-line new-cap
          XiboFormSubmit($(form), null, () => {
            // Is this an add or an edit?
            const displayOrder = $form.data('existingDisplayOrder');
            if (displayOrder && parseInt(displayOrder) > 0) {
              // Delete the existing assignment
              $.ajax({
                method: 'delete',
                url: $form.data('assignmentRemoveUrl') +
                  '&displayOrder=' + displayOrder,
                complete: () => {
                  refreshLayoutAssignmentsTable();
                },
              });
            } else {
              refreshLayoutAssignmentsTable();
            }
          });
        },
        errorElement: 'span',
        highlight: function(element) {
          $(element).closest('.form-group')
            .removeClass('has-success')
            .addClass('has-error');
        },
        success: function(element) {
          $(element).closest('.form-group')
            .removeClass('has-error')
            .addClass('has-success');
        },
        invalidHandler: function(event, validator) {
          // Remove the spinner
          $(this).closest('.modal-dialog').find('.saving').remove();
          $(this).closest('.modal-dialog').find('.save-button')
            .removeClass('disabled');
        },
      });
    }).on('hidden.bs.modal', function() {
      // Clear the layout select
      if (cB.$layoutSelect) {
        cB.$layoutSelect.val(null).trigger('change');
      }
    });
  },

  initialiseLayoutAssignmentsTable: function($selector) {
    // eslint-disable-next-line new-cap
    this.layoutAssignments = $selector.DataTable({
      language: dataTablesLanguage,
      responsive: true,
      dom: dataTablesTemplate,
      filter: false,
      searchDelay: 3000,
      order: [[0, 'asc']],
      ajax: {
        url: $selector.data('searchUrl'),
        dataSrc: function(json) {
          if (json && json.data && json.data.length > 0) {
            return json.data[0].layouts;
          } else {
            return [];
          }
        },
      },
      columns: [
        {
          data: 'layoutId',
          responsivePriority: 5,
        },
        {
          data: 'layout',
          responsivePriority: 1,
        },
        {
          data: 'duration',
          responsivePriority: 1,
        },
        {
          data: 'dayPart',
          responsivePriority: 1,
        },
        {
          data: 'daysOfWeek',
          responsivePriority: 3,
          render: function(data) {
            if (data) {
              const readable = [];
              data.split(',').forEach((e) => {
                readable.push(campaignBuilderTrans.daysOfWeek[e] || e);
              });
              return readable.join(', ');
            } else {
              return '';
            }
          },
        },
        {
          data: 'geoFence',
          responsivePriority: 10,
        },
        {
          data: function(data, type, row, meta) {
            const buttons = [
              {
                id: 'assignment_button_edit',
                text: campaignBuilderTrans.assignmentEditButton,
                url: '#',
                external: false,
                class: 'button-assignment-remove',
                dataAttributes: [
                  {
                    name: 'row-id',
                    value: meta.row,
                  },
                ],
              },
              {
                id: 'assignment_button_delete',
                text: campaignBuilderTrans.assignmentDeleteButton,
                url: $selector.data('assignmentDeleteUrl')+
                  '?displayOrder=' + data.displayOrder,
              },
            ];
            return dataTableButtonsColumn({buttons: buttons}, type, row, meta);
          },
          orderable: false,
          responsivePriority: 1,
        },
      ],
    });
    this.layoutAssignments.on('draw', function(e, settings) {
      const $target = $('#' + e.target.id);
      $target.find('.button-assignment-remove').on('click', function(e) {
        e.preventDefault();
        const $button = $(this);
        if ($button.hasClass('assignment_button_edit')) {
          // Open a form.
          cB.openLayoutForm(
            cB.layoutAssignments.rows($button.data('rowId')).data()[0],
            campaignBuilderTrans.editLayoutFormTitle,
          );
        }
        return false;
      });

      // eslint-disable-next-line new-cap
      XiboInitialise('#' + e.target.id);
    });
  },
};

$(function() {
  // Get our container
  const $container = $('#campaign-builder');
  cB.initialise($container);

  // Initialise some form controls.
  cB.initaliseDisplaySelect(
    $container.find('select[name="displayGroupIds[]"]'),
  );

  cB.initialiseLayoutSelect(
    $container.find('select[name="layoutId"]'),
  );

  cB.initialiseLayoutAssignmentsTable(
    $container.find('table#table-campaign-builder-layout-assignments'),
  );
});

window.refreshLayoutAssignmentsTable = function() {
  // Reload the data table
  if (cB.layoutAssignments) {
    cB.layoutAssignments.ajax.reload();
  }
};
