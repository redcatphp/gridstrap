(function($){

	var Gridstrap = function(el, opts) {
		this.container = $(el);
		var self = this;
		var container = this.container;
		
		this.opts = $.extend(true,{
			width: 12,
			cellHeight: 80,
			defaultWidth: 3,
			resizable:{
				//helper: "resizable-helper",
				//handles: { 'e':'.gs-resizer' },
				handles: 'e',
				resize:function(e,ui){
					self.resizeCallback(this,ui,e);
				},
				stop: function(){
					$(this).css('width','');
					$(this).trigger('gs-resized');
				}
			},
		}, opts || {} );
		this.itemsSelector = '> [data-col]';
		
		
		container.addClass('gs-editing');
		container.addClass('gridstrap');

		//$(document)
			//.on('click', '.gm-preview', function() {
				//if(!self.hasClass('gs-editing')) {
					//self.addClass('gs-editing');
					//$(this).addClass('active');
				//}
				//else{
					//self.removeClass('gs-editing');
					//$(this).removeClass('active');
				//}
			//})
		//;
		
		container.on('mouseover.gs', '.gs-col', function(e){
			if(e.stopNamespacePropagation) return;
			e.stopNamespacePropagation = true;
			$(this).addClass('mouseover');
		}).on('mouseout.gs', '.gs-col', function(e){
			if(e.stopNamespacePropagation) return;
			e.stopNamespacePropagation = true;
			$(this).removeClass('mouseover');
		});
		
		this.hanldeSortable(container);
	};
	
	Gridstrap.prototype.resizeCallback = function(el,ui,e){
		var $this = $(el);
		var containerW = $this.parent().innerWidth();
		var colW = containerW/12;
		var col = Math.ceil( ui.size.width/colW );
		$this.addClass('no-transition');
		$this.attr('data-col', col );
		$this.css('width', '');
		$this.removeClass('no-transition');
		$this.trigger('gs-resizing');
	};
	
	Gridstrap.prototype.hanldeSortable = function(rows){
		var self = this;
		var container = this.container;
		var items = self.itemsSelector;
		var cleanTempItems = function(row){
			row.find(items).filter(':not(.gs-moving, .gs-clone)').each(function(){
				var item = $(this);
				var clone = item.data('gs-clone');
				if(clone){
					clone.remove();
				}
				item.css('visibility','visible');
			});
			row.find('.gs-moving').removeClass('gs-moving');
		};
		var makeTempItems = function(row){
			row.find(items).filter(':not(.gs-moving)').each(function(){
				var item = $(this);
				var position = item.position();
				var clone = item.clone();
				item.data('gs-clone',clone);
				clone.addClass('gs-clone');
				clone.css({
					position: 'absolute',
					top: position.top,
					left: position.left,
					height: item.height(),
				});
				item.after(clone);
				item.css('visibility','hidden');
			});
		};
		var disableTargets = function(row,ui){
			var el = ui.item;
			var accepted = el.attr('data-gs-accepted-container');
			$('.gridstrap .gs-row').each(function(){
				var $this = $(this);
				if($this.closest('.gs-clone').length) return;
				var ok = !accepted || $this.is(accepted);
				if(ok){
					el.find('[data-gs-accepted-container]').each(function(){
						var accepted = $(this).attr('data-gs-accepted-container');
						if(!el.is(accepted)&&!row.is(accepted)){
							ok = false;
							return false;
						}
						
					});
				}
				if(!ok){
					$this.sortable('disable');
					row.sortable('refresh');
				}
			});
		};
		var reenableTargets = function(row,ui){
			$('.gridstrap .gs-row').each(function(){
				var $this = $(this);
				if($this.closest('.gs-clone').length) return;
				$this.sortable('enable');
				row.sortable('refresh');
			});
		};
		rows.each(function(){
			var row = $(this);
			if(row.hasClass('ui-sortable')){
				row.sortable('refresh');
				return;
			}
			row.sortable({
				items: items,
				connectWith: '.gridstrap .gs-row',
				revert: 400,
				tolerance: 'intersect',
				placeholder: 'gs-placeholder',
				//helper: 'clone',
				start: function(e, ui){
					//console.log('start',this);
					ui.placeholder.css({
						height: ui.item.height(),
						width: ui.item.outerWidth(),
					});
					ui.placeholder.html('<div class="gs-content"></div>');
					ui.item.addClass('gs-moving');
					
					makeTempItems(row);
					disableTargets(row, ui);
				},
				over: function(e, ui){
					//console.log('over',this);
					
					//ext draggable
					self.attribDataRow(row,ui);
					var h = $( row.find('[data-row="'+ui.item.attr('data-row')+'"]').not(ui.item)[0] ).height();
					ui.item.css('min-height',h+'px');
					ui.placeholder.css('min-height',h+'px');
					
				},
				change: function(e, ui){
					//console.log('change',this);
					
					$(ui.item).data('gs-changed',true);
					row.data('gs-changed',true);
					
					self.attribDataRow(row,ui);
					
					var h = $( row.find('[data-row="'+ui.item.attr('data-row')+'"]').not(ui.item)[0] ).height();
					ui.item.css('min-height',h+'px');
					ui.placeholder.css('min-height',h+'px');

					row.find(items).filter(':not(.gs-moving, .gs-clone)').each(function(){
						var item = $(this);
						var clone = item.data('gs-clone');
						if(clone){
							var position = item.position();
							clone.css({
								top: position.top,
								left: position.left,
								height: item.height(),
							});
						}
					});
					
				},
				out: function(e, ui){
					//console.log('out',this);
					
					$(ui.item).data('gs-changed',false);
					row.data('gs-changed',false);
					cleanTempItems(row);
				},
				stop: function(e, ui){
					//console.log('stop',this);
					reenableTargets(row, ui);
				},
				update: function(e, ui){
					//console.log('update',this);
				},
				activate: function(e, ui){
					//console.log('activate',this);
					$(this).addClass('gs-state-highlight');
				},
				deactivate: function(e, ui){
					//console.log('deactivate');
					$(this).removeClass('gs-state-highlight');
				},
				beforeStop: function(e, ui){
					//console.log('beforeStop',this);
				},
				create: function(e, ui){
					//console.log('create',this);
				},
				receive: function(e, ui){
					//console.log('receive',this);
					//var container = ui.item.attr('data-gs-accepted-container');
					//if( container && !$(this).is(container) ){
						//$(ui.sender).sortable('cancel');
					//}
				},
				remove: function(e, ui){
					//console.log('remove',this);
				},
				sort: function(e, ui){
					//console.log('sort',this);
				},
			});
		});
	};
	
	Gridstrap.prototype.getCurrentOrderedCols = function(row,ui){
		var sCols = [];
		var cols = row.find('> .gs-placeholder, > .gs-col:not(.gs-moving, .gs-clone)');
		cols.each(function(){
			if(this===ui.placeholder[0]){
				sCols.push( ui.item );
			}
			else{
				sCols.push( $(this) );
			}
		});
		return $(sCols);
	};
	Gridstrap.prototype.attribDataRow = function(row,ui){
		var self = this;
		var cols = self.getCurrentOrderedCols(row,ui);
		var currentRow = 1;
		var ttWidth = 0;
		cols.each(function(){
			var $this = $(this);
			ttWidth += self.width( $this );
			if(ttWidth>self.opts.width){
				ttWidth = 0;
				currentRow++;
			}
			$this.attr('data-row',currentRow);
		});
	};
	
	Gridstrap.prototype.add = function(el,width,container){
		var self = this;
		if(!width){
			width = el.attr('data-col') || this.defaultWidth;
		}
		el.attr('data-col',width);
		el.addClass('gs-col');
		if(!container){
			container = this.container;
		}
		container.append(el);
		this.hanldeSortable(container);
		
		var rows = el.find('.gs-row');
		//console.log(el,rows);
		
		this.hanldeSortable(rows);
		
		//el.append('<div class="gs-resizer ui-resizable-handle ui-resizable-e"><i class="fa fa-arrows-h" style="display:block;"></i></div>');
		el.resizable(this.opts.resizable);
	};
	
	Gridstrap.prototype.widthMinus = function(col){
		var size = (parseInt(col.attr('data-col'),10) || 1) - 1;
		if(size<1) size = 1;
		return this.width(col,size);
	};
	Gridstrap.prototype.widthPlus = function(col){
		var size = (parseInt(col.attr('data-col'),10) || 1) + 1;
		if(size>this.opts.width) size = this.opts.width;
		return this.width(col,size);
	};
	Gridstrap.prototype.width = function(col,size){
		if(size){
			col.attr('data-col' ,size);
		}
		else{
			size = parseInt(col.attr('data-col'),10) || 1;
		}
		return size;
	};
	Gridstrap.prototype.remove = function(col){
		col.animate({
			opacity: 'hide',
			width: 'hide',
			height: 'hide'
		}, 400, function() {
			col.remove();
		});
	};
	
	$.fn.gridstrap = function(opts) {
		return this.each(function() {
			var o = $(this);
			if (!o.data('gridstrap')) {
				o.data('gridstrap', new Gridstrap(this, opts));
			}
		});
	};

})(jQuery);
