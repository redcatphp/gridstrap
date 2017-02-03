(function($){
	
	var _rearrange = $.ui.sortable.prototype._rearrange;
	$.widget('ui.sortable',$.extend($.ui.sortable.prototype,{
		_rearrange: function( event, i, a, hardRefresh ) {
			if(!( !a&&!i.item[ 0 ].parentNode ))
				return _rearrange.apply(this,arguments);
		},
	}));
	
	var Gridstrap = function(el, opts) {
		this.container = $(el);
		var self = this;
		var container = this.container;
		
		this.opts = $.extend(true,{
			width: 12,
			cellHeight: 80,
			defaultWidth: 3,
			connectWith: '.gridstrap:visible .gs-col:not(.gs-clone) .gs-row, .gridstrap:visible > .gs-row',
			scroll: true,
			scrollParent: false,
			scrollCallback: false,
			resizable:{
				handles: 'e',
				start: function(e,ui){
					ui.element.css('transition-duration','0s');
				},
				resize:function(e,ui){
					self._resizeCallback(this,ui,e);
				},
				stop: function(e,ui){
					$(this).css('width','');
					$(this).trigger('gs-resized');
					ui.element.css('transition-duration','');
				}
			},
			boxPadding: 15, //$box-padding .gs-col and .gs-placeholder horizontal padding for autoAdjustWidth calculation
			gsColTransitionWidth: 400, //$gs-col-transition-width .gs-col{ transition width duration }, .gs-margin{ transition width left }
			debugEvents: false,
			//debugEvents: true,
			cloneCallback: null,
			smooth: true,
		}, opts || {} );
		this.itemsSelector = '> .gs-col:not(.gs-clone, .gs-moving)';
		
		this.currentActiveSortables = [];
		
		container.addClass('gs-editing');
		container.addClass('gridstrap');
		
		container.on('mouseover.gs', '.gs-col', function(e){
			if(e.stopNamespacePropagation) return;
			e.stopNamespacePropagation = true;
			this.classList.add('gs-mouseover');
		}).on('mouseout.gs', '.gs-col', function(e){
			if(e.stopNamespacePropagation) return;
			e.stopNamespacePropagation = true;
			this.classList.remove('gs-mouseover');
		});
		
		
		var rootRow = container.find('>.gs-row');
		if(!rootRow.length){
			rootRow = $('<div class="gs-row" />').appendTo(container);
		}
		
		this.sortable(rootRow);
	};
	Gridstrap.prototype = {		
		_resizeCallback: function(el,ui,e){
			var self = this;
			var $this = $(el);
			var containerW = $this.parent().innerWidth();
			var colW = containerW/self.opts.width;
			var padding = 15;
			var col = (ui.size.width+padding) /colW;
			col = Math.round( col );
			$this.attr('data-gs-col', col );
			$this.trigger('gs-resizing');
		},
		
		_rowWidth: function(row, n, padding){
			return row.width() * n/this.opts.width - (padding ? this.opts.boxPadding*2 : 0);
		},
		
		_makeTempItems: function(row){
			var self = this;
			if(!self.opts.smooth){
				return;
			}
			if(row.data('gs-temp-item')) return;
			row.data('gs-temp-item',true);
			row.find(self.itemsSelector).each(function(){
				var item = $(this);
				if(item.data('gs-clone')) return;
				var position = item.position();
				var clone = item.clone();
				if(self.opts.cloneCallback){
					self.opts.cloneCallback(clone);
				}
				item.data('gs-clone',clone);
				clone.addClass('gs-clone');
				clone.css({
					position: 'absolute',
					top: position.top,
					left: position.left,
					height: item.outerHeight(),
					'z-index': 4,
				});	
				item.after(clone);
				item.css('opacity',0);
			});
			row.sortable('refresh');
		},
		_updateTempItems: function(row){
			if(!row.data('gs-temp-item')) return;
			var self = this;		
			row.find(self.itemsSelector).each(function(){
				var item = $(this);
				var clone = item.data('gs-clone');
				if(clone){
					var position = item.position();
					clone.css({
						top: position.top,
						left: position.left,
						height: item.outerHeight(),
					});
				}
			});
		},
		_cleanTempItems: function(row){
			if(!row.data('gs-temp-item')) return;
			row.data('gs-temp-item',false);
			var self = this;
			row.find(self.itemsSelector).each(function(){
				var item = $(this);
				var clone = item.data('gs-clone');
				if(clone){
					clone.remove();
					item.data('gs-clone',false);
				}
				item.css('opacity',1);
			});
		},
		_disableTargets: function(row,ui){
			var self = this;
			var el = ui.item;
			var accepted = el.attr('data-gs-accepted-container');
			var rowCol = row.closest('.gs-col');
			$('.gs-row.ui-sortable',self.container).each(function(){
				var $this = $(this);
				if($this.closest('.gs-clone').length) return;
				var ok;
				ok = !$this.closest('.gs-moving').length;
				if(ok){
					ok = !accepted || $this.closest('.gs-col').is(accepted);
				}
				if(ok){
					el.find('[data-gs-accepted-container]').each(function(){
						var accepted = $(this).attr('data-gs-accepted-container');
						if(!el.is(accepted)&&!rowCol.is(accepted)){
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
		},
		_reenableTargets: function(row,ui){
			var self = this;
			$('.gs-row.ui-sortable',self.container).each(function(){
				var $this = $(this);
				if($this.closest('.gs-clone').length) return;
				$this.sortable('enable');
				row.sortable('refresh');
			});
		},
		_autoAdjustWidth: function(row,ui){
			var self = this;
			var item = ui.item;
			var placeholder = ui.placeholder;
			var w = self._rowWidth(row,self.width(item));
			var p = 100 / self.opts.width;
			placeholder.css({
				width: Math.floor(w),
				'margin-left': ( self.left(item) * p ) + '%',
				'margin-right': ( self.right(item) * p ) + '%',
			});
			
			w = self._rowWidth(row,self.width(item),true);
			item.width( w );
		},

		_updateTempItemsAll: function(rows){
			var self = this;
			$.each(self.currentActiveSortables,function(i,row){
				self._updateTempItems(row);
			})
		},
		
		_isOverAxis: function( x, reference, size ) {
			return ( x >= reference ) && ( x < ( reference + size ) );
		},
		
		_getCurrentOrderedCols: function(row,ui){
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
		},
		
		_attribDataRow: function(row,ui){
			var self = this;
			var cols = self._getCurrentOrderedCols(row,ui);
			var currentRow = 1;
			var ttWidth = 0;
			cols.each(function(){
				var $this = $(this);
				ttWidth += self.width( $this );
				if(ttWidth>self.opts.width){
					ttWidth = 0;
					currentRow++;
				}
				$this.attr('data-gs-row',currentRow);
			});
		},
		
		_sizePlaceholderToHelper: function(ui){
			if(!ui.item.hasClass('gs-integrated')){
				ui.helper.css({
					height:(ui.placeholder.height())+'px',
					width:(ui.placeholder.width())+'px',
				});
			}
		},
		
		sortable: function(rows){
			var self = this;
			rows.each(function(){
				var row = $(this);
				var autoHeightTimeout;
				if(row.hasClass('ui-sortable')){
					row.sortable('refresh');
					return;
				}
				var sortableOptions = {
					items: self.itemsSelector,
					connectWith: self.opts.connectWith,
					revert: false,
					scroll: self.opts.scroll,
					scrollSensitivity: 20, //default 20
					scrollSpeed: 20, //default 20
					tolerance: 'intersect', //intersect || pointer
					placeholder: 'gs-placeholder',
					appendTo: document.body,
					cursor: 'grabbing',
					start: function(e, ui){
						var item = ui.item;
						if(self.opts.debugEvents) console.log('start',this);
						
						item.data('gs-startrow',row.get(0));
						item.data('gs-startindex',item.index());
						
						var external = !item.hasClass('gs-integrated');
						ui.placeholder.css({
							height: external?'auto':item.height(),
							width: Math.floor(item.width()),
							'margin-left': ( self.left(item) * 100 / self.opts.width ) + '%',
							'margin-right': ( self.right(item) * 100 / self.opts.width ) + '%',
						});
						if(external){
							ui.placeholder.css('min-height',90);
						}
						
						ui.placeholder.html('<div class="gs-content"></div>');
						item.addClass('gs-moving');
						
						self._disableTargets(row, ui);
						
						if(!item.hasClass('gs-integrated')){
							ui.helper.addClass('gs-sortable-helper');
						}
					},
					over: function(e, ui){
						if(self.opts.debugEvents) console.log('over',this,row);
						
						if(!ui.item.hasClass('gs-integrated')){
							var sortable = row.data('ui-sortable');
							var lastItem;
							row.find(self.itemsSelector).each(function(){
								var item = $(this);
								var offset = item.offset();
								var isOverElementHeight = self._isOverAxis( sortable.positionAbs.top + sortable.offset.click.top, offset.top, item.height() );						
								if(isOverElementHeight){
									lastItem = item;
								}
							});
							ui.placeholder.insertAfter(lastItem);
						}
						
						ui.item.parents('.gs-col').addClass('gs-moving-parent');
						
						self._autoAdjustWidth(row, ui);
						
						this.classList.add('gs-moving-parent');
						$(this).parents('.gs-col').addClass('gs-moving-parent');
						
						self._sizePlaceholderToHelper(ui);
						
						self._updateTempItemsAll();
						
						self.container.find('.gs-state-over').removeClass('gs-state-over');
						row.addClass('gs-state-over');
					},
					change: function(e, ui){
						if(self.opts.debugEvents) console.log('change',this);

						self._sizePlaceholderToHelper(ui);
						
						self._updateTempItemsAll();
						
						//self.container.find('.gs-state-over').removeClass('.gs-state-over');
						//ui.placeholder.closest('.gs-row').addClass('gs-state-over');
					},
					out: function(e, ui){
						if(self.opts.debugEvents) console.log('out',this);
						this.classList.remove('gs-moving-parent');
						$(this).parents('.gs-col').removeClass('gs-moving-parent');
						
						//row.find('.gs-placeholder').hide();
						
						self._updateTempItemsAll();
						
						row.removeClass('gs-state-over');
					},
					stop: function(e, ui){
						if(self.opts.debugEvents) console.log('stop',this);
						
						var item = ui.item;
						if(item.data('gs-startrow')!==item.closest('.gs-row').get(0)){
							if(self.opts.debugEvents) console.log('gs-col-changed',this);
							row.trigger('gs-col-changed',[ui]);
						}
						if(item.data('gs-startindex')!==item.index()){
							if(self.opts.debugEvents) console.log('gs-row-changed',this);
							row.trigger('gs-row-changed',[ui]);
						}
						
						if(!item.hasClass('gs-integrated')){
							item.css('height','');
							item.css('min-height','');
							item.css('left','');
							item.css('top','');
							item.css('width','');
							row.trigger('gs-received',[ui]);
							item.addClass('gs-integrated');
							item.removeClass('gs-sortable-helper');
						}
						
						self._reenableTargets(row, ui);
						self.container.find('.gs-moving-parent').removeClass('gs-moving-parent');
					},
					update: function(e, ui){
						if(self.opts.debugEvents) console.log('update',this);
					},
					activate: function(e, ui){						
						if(self.opts.debugEvents) console.log('activate',this);
						this.classList.add('gs-state-highlight');
						
						var parentCol = $(this).closest('.gs-col');
						if(parentCol.length){
							var parentClone = parentCol.data('gs-clone');
							if(parentClone){
								parentClone.find('>.gs-content>.gs-row').addClass('gs-state-highlight');
							}
						}
						
						self._makeTempItems(row);
						
						self.currentActiveSortables.push(row);
					},
					deactivate: function(e, ui){
						if(self.opts.debugEvents) console.log('deactivate',this);
						this.classList.remove('gs-state-highlight');
						row.removeClass('.gs-state-over');
						row.find('.gs-moving').removeClass('gs-moving');
						
						self._cleanTempItems(row);
						
						var index = self.currentActiveSortables.indexOf(row);
						if (index > -1) {
							self.currentActiveSortables.splice(index, 1);
						}
					},
					beforeStop: function(e, ui){
						if(self.opts.debugEvents) console.log('beforeStop',this);
					},
					create: function(e, ui){
						if(self.opts.debugEvents) console.log('create',this);
					},
					receive: function(e, ui){
						if(self.opts.debugEvents) console.log('receive',this);
					},
					remove: function(e, ui){
						if(self.opts.debugEvents) console.log('remove',this);
					},
					sort: function(event, ui){
						if(scrollCallback){
							scrollCallback(event, ui);
						}
					},
				};
				
				var scrollCallback;
				if(self.opts.scrollCallback){
					var scrollParent = self.opts.scrollParent || row.scrollParent();
					if(typeof(scrollParent)=='function'){
						scrollParent = scrollParent(row);
					}
					var scrollParentEl = scrollParent[0];
					scrollCallback = function(event, ui){
						var overflowOffset = scrollParent.offset();
						if( overflowOffset.top + scrollParentEl.offsetHeight - event.pageY < sortableOptions.scrollSensitivity ){
							self.opts.scrollCallback(scrollParentEl.scrollTop + sortableOptions.scrollSpeed, scrollParent);
						}
						else if( event.pageY - overflowOffset.top < sortableOptions.scrollSensitivity ){
							self.opts.scrollCallback(scrollParentEl.scrollTop - sortableOptions.scrollSpeed, scrollParent);
						}
					};
				}
				
				row.sortable(sortableOptions);
			});
		},
		
		prepareAdd: function(el,width,container){
			var self = this;
			if(!width){
				width = el.attr('data-gs-col') || this.defaultWidth;
			}
			el.attr('data-gs-col',width);
			el.addClass('gs-col');
			el.addClass('gs-integrated');
			if(!container){
				container = this.container;
			}
			if(el.parent().get(0)!==container.get(0)){
				container.append(el);
			}
			this.sortable(container);
			self.container.trigger('gs:adding');
		},
		handleAdd: function(el){
			var self = this;
			
			var rows = el.find('.gs-row');
			if(rows.length){
				el.addClass('gs-nested');
			}
			
			el.prepend('<div class="gs-margin gs-margin-left" />');
			el.append('<div class="gs-margin gs-margin-right" />');
			el.on('mouseover',function(){
				self._setMargin(el);
			});
			
			this.sortable(rows);
			
			el.resizable(this.opts.resizable);
			self.container.trigger('gs:added');
		},
		add: function(el,width,container){
			this.prepareAdd(el,width,container);
			this.handleAdd(el);
		},
		
		_setMarginHeight: function(col){
			var self = this;
			var ml = col.find('>.gs-margin-left');
			var mr = col.find('>.gs-margin-right');
			var h = col.find('>.gs-content').outerHeight() - 1;
			ml.height(h);
			mr.height(h);
		},
		_setMargin: function(col){
			var self = this;
			var row = col.closest('.gs-row');
			var ml = col.find('>.gs-margin-left');
			var mr = col.find('>.gs-margin-right');
			var l = self.left(col);
			var r = self.right(col);
			var wr = r ? self._rowWidth(row,r,false) : 0;
			var wl = l ? self._rowWidth(row,l,false) : 0;
			
			ml.css('left', (l ? (-1*wl) + self.opts.boxPadding -1 : 0));
			ml.width(wl-1);
			
			mr.css('right', (r ? (-1*wr) + self.opts.boxPadding -1 : 0));
			mr.width(wr-1);
			self._setMarginHeight(col);
		},
		
		widthMinus: function(col){
			return this.width( col, this.width(col)-1 );
		},
		widthPlus: function(col){
			return this.width( col, this.width(col)+1 );
		},
		width: function(col,width){
			var self = this;
			if(width){
				var size = this.left(col)+width+self.right(col);
				if(size<=this.opts.width&&width>=1){
					var oldw = col.attr('data-gs-col');
					if(parseInt(oldw,10)!=width){
						col.attr('data-gs-col' ,width);
						col.trigger('gs-width-change');
					}
					self._afterWidth(col);
					return width;
				}
			}
			width = parseInt(col.attr('data-gs-col'),10) || 1;
			return width;
		},
		
		_afterWidth: function(col){
			var self = this;
			self._setMargin( col );
			var timeout;
			timeout = col.data('gs-width-timeout');
			if(timeout){
				clearTimeout(timeout);
			}
			timeout = setTimeout(function(){
				self._setMarginHeight( col );
				
			},self.opts.gsColTransitionWidth);
			col.data('gs-width-timeout',timeout);
		},
		
		leftMinus: function(col){
			return this.left( col, this.left(col)-1 );
		},
		leftPlus: function(col){
			return this.left( col, this.left(col)+1 );
		},
		rightMinus: function(col){
			return this.right( col, this.right(col)-1 );
		},
		rightPlus: function(col){
			return this.right( col, this.right(col)+1 );
		},
		
		left: function(col,offset){
			if(typeof(offset)!='undefined'&&offset!==false&&offset>=0){
				var size = offset+this.width(col)+this.right(col);
				if(size<=this.opts.width&&size>=1){
					col.attr('data-gs-left' ,offset);
					this._setMargin(col);
					return offset;
				}
			}
			offset = parseInt(col.attr('data-gs-left'),10) || 0;
			return offset;
		},
		right: function(col,offset){
			if(typeof(offset)!='undefined'&&offset!==false&&offset>=0){
				var size = this.left(col)+this.width(col)+offset;
				if(size<=this.opts.width&&size>=1){
					col.attr('data-gs-right' ,offset);
					this._setMargin(col);
					return offset;
				}
			}
			offset = parseInt(col.attr('data-gs-right'),10) || 0;
			return offset;
		},
		
		remove: function(col){
			var defer = $.Deferred();
			var self = this;
			col.animate({
				opacity: 'hide',
				width: 'hide',
				height: 'hide'
			}, 400, function() {
				col.remove();
				self.container.trigger('gs:remove',col);
				defer.resolve();
			});
			return defer;
		},
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