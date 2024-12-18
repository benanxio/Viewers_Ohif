import React, { useState } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { useDrag } from 'react-dnd';
import { Icons } from '../Icons';
import { DisplaySetMessageListTooltip } from '../DisplaySetMessageListTooltip';
import { TooltipTrigger, TooltipContent, Tooltip } from '../Tooltip';
import { Button } from '../Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../DropdownMenu';
import { useCustomContext } from '@state';
/**
 * Display a thumbnail for a display set.
 */
const Thumbnail = ({
  displaySetInstanceUID,
  className,
  imageSrc,
  imageAltText,
  description,
  seriesNumber,
  numInstances,
  loadingProgress,
  countIcon,
  messages,
  dragData = {},
  isActive,
  onClick,
  onDoubleClick,
  viewPreset = 'thumbnails',
  modality,
  isHydratedForDerivedDisplaySet = false,
  canReject = false,
  onReject = () => {},
  isTracked = false,
  thumbnailType = 'thumbnail',
  onClickUntrack = () => {},
  onThumbnailContextMenu,
  isMobile = false,
}: withAppTypes): React.ReactNode => {
  // TODO: We should wrap our thumbnail to create a "DraggableThumbnail", as
  // this will still allow for "drag", even if there is no drop target for the
  // specified item.
  const { totalData, isMobile: _ } = useCustomContext();
  const [collectedProps, drag, dragPreview] = useDrag({
    type: 'displayset',
    item: { ...dragData },
    canDrag: function (monitor) {
      return Object.keys(dragData).length !== 0;
    },
  });

  const isDoc = modality === 'DOC';

  const [lastTap, setLastTap] = useState(0);
  const handleTouchEnd = e => {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap;
    if (tapLength < 300 && tapLength > 0) {
      onDoubleClick(e);
    } else {
      onClick(e);
    }
    setLastTap(currentTime);
  };

  const currentThumbnail = totalData.find(
    val => val.displaySetInstanceUID === displaySetInstanceUID
  );

  const renderThumbnailPreset = () => {
    return (
      <div
        className={classnames(
          'flex h-full w-full flex-col items-center justify-center',
          isMobile ? 'gap-[2px] p-[4px]' : 'gap-2 p-4'
        )}
      >
        <div className={classnames(isMobile ? 'h-[114px] w-[128px]' : 'h-[126px] w-[186px]')}>
          <div className="relative">
            {imageSrc ? (
              <img
                src={imageSrc}
                alt={imageAltText}
                className={classnames(
                  'border-primary-light rounded bg-black object-contain',
                  isMobile ? 'h-[114px] w-[128px]' : 'h-[126px] w-[186px]',
                  isActive
                    ? 'border-2'
                    : 'group-hover:border-primary-active border group-hover:border-2'
                )}
                crossOrigin="anonymous"
              />
            ) : (
                <div
                  className={classnames(
                    'border-primary-light rounded border bg-black',
                    isMobile ? 'h-[114px] w-[128px]' : 'h-[126px] w-[186px]'
                  )}
                ></div>
            )}

            {/* bottom left */}
            <div className="absolute bottom-1 left-1 flex h-[14px] items-center gap-[4px] rounded-tr pt-[10px] pb-[8px] pr-[6px] pl-[3px]">
              <div
                className={classnames(
                  'h-[10px] w-[10px] rounded-[2px]',
                  isActive || isHydratedForDerivedDisplaySet
                    ? 'bg-primary-light'
                    : 'bg-primary-light/65',
                  loadingProgress && loadingProgress < 1 && 'bg-primary/25'
                )}
              ></div>
              <div className="text-[11px] font-semibold text-white">{modality}</div>
            </div>
            {/* top right */}
            <div className="absolute top-0 right-0 hidden items-center gap-[4px]">
              <DisplaySetMessageListTooltip
                messages={messages}
                id={`display-set-tooltip-${displaySetInstanceUID}`}
              />
              {isTracked && (
                <Tooltip>
                  <TooltipTrigger>
                    <div className="group">
                      <Icons.StatusTracking className="text-primary-light h-[20px] w-[20px] group-hover:hidden" />
                      <Icons.Cancel
                        className="text-primary-light hidden h-[15px] w-[15px] group-hover:block"
                        onClick={onClickUntrack}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <div className="flex flex-1 flex-row">
                      <div className="flex-2 flex items-center justify-center pr-4">
                        <Icons.InfoLink className="text-primary-active" />
                      </div>
                      <div className="flex flex-1 flex-col">
                        <span>
                          <span className="text-white">
                            {isTracked ? 'Series is tracked' : 'Series is untracked'}
                          </span>
                        </span>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            {/* bottom right */}
            <div className="absolute bottom-0 right-0 hidden items-center gap-[4px] p-[4px]">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hidden group-hover:inline-flex data-[state=open]:inline-flex"
                  >
                    <Icons.More />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  hideWhenDetached
                  align="start"
                >
                  <DropdownMenuItem
                    onSelect={() => {
                      onThumbnailContextMenu('openDICOMTagViewer', {
                        displaySetInstanceUID,
                      });
                    }}
                    className="gap-[6px]"
                  >
                    <Icons.DicomTagBrowser />
                    Tag Browser
                  </DropdownMenuItem>
                  {canReject && (
                    <DropdownMenuItem
                      onSelect={() => {
                        onReject();
                      }}
                      className="gap-[6px]"
                    >
                      <Icons.Trash className="h-5 w-5 text-red-500" />
                      Delete Report
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
        <div
          className={classnames(
            'flex h-[52px] flex-col',
            isMobile ? 'w-[128px]' : 'mb-3 w-[186px]'
          )}
        >
          <div
            className={classnames(
              'inline-flex !min-h-[24px] items-center justify-between overflow-hidden text-ellipsis pb-0.5 pl-1 text-[12px] font-normal leading-4 text-white',
              isMobile ? 'w-[128px]' : 'w-[186px]'
            )}
          >
            {description}
            {currentThumbnail && !currentThumbnail.loading && (
              <Tooltip>
                <TooltipTrigger>
                  <div className="group">
                    <Icons.StatusTracking className="h-4 w-4 cursor-pointer text-green-600" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <div className="flex flex-1 flex-row">
                    <div className="flex-2 flex items-center justify-center pr-4">
                      <Icons.InfoLink className="text-primary-active" />
                    </div>
                    <div className="flex flex-1 flex-col">Serie cargada</div>
                  </div>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <div className="flex h-4 items-center gap-[7px] overflow-hidden">
            <div className="pl-1 text-base text-white">
              <span className="text-primary-main font-semibold">{'S: '}</span>
              {seriesNumber}
            </div>
            <div className="text-base text-white">
              <div className="flex items-center gap-[4px]">
                {countIcon ? (
                  React.createElement(Icons[countIcon] || Icons.MissingIcon, {
                    className: 'w-4 h-4',
                  })
                ) : (
                  <Icons.InfoSeries className="w-3" />
                )}
                <div>{numInstances}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderListPreset = () => {
    return (
      <div
        className={classnames(
          'hover:bg-primary-main/25 flex h-full w-full items-center justify-between pr-[8px] pl-[8px] pt-[4px] pb-[4px]',
          isActive && 'bg-primary-main/25'
        )}
      >
        <div className="relative flex h-[62px] items-center gap-[8px]">
          <div
            className={classnames(
              'h-[62px] w-[4px] rounded-[2px]',
              isActive || isHydratedForDerivedDisplaySet ? 'bg-highlight' : 'bg-primary/65',
              loadingProgress && loadingProgress < 1 && 'bg-primary/25'
            )}
          ></div>
          <div className="flex h-full flex-col justify-center">
            <div className="flex flex-col items-start gap-[7px]">
              <div className="text-[13px] font-semibold text-white">{modality}</div>

              <div className="max-w-[160px] overflow-hidden overflow-ellipsis whitespace-nowrap text-[13px] font-normal text-white">
                {description}
              </div>
            </div>

            {/* <div className="flex h-[12px] items-center gap-[7px] overflow-hidden">
              <div className="text-muted-foreground text-[12px]"> S:{seriesNumber}</div>
              <div className="text-muted-foreground text-[12px]">
                <div className="flex items-center gap-[4px]">
                  {' '}
                  {countIcon ? (
                    React.createElement(Icons[countIcon] || Icons.MissingIcon, { className: 'w-3' })
                  ) : (
                    <Icons.InfoSeries className="w-3" />
                  )}
                  <div>{numInstances}</div>
                </div>
              </div>
            </div> */}
          </div>
        </div>
        <div className="flex h-full items-center gap-[4px]">
          <DisplaySetMessageListTooltip
            messages={messages}
            id={`display-set-tooltip-${displaySetInstanceUID}`}
          />

          {isTracked && (
            <Tooltip>
              <TooltipTrigger>
                <div className="group">
                  <Icons.StatusTracking className="text-primary-light h-[20px] w-[20px] group-hover:hidden" />
                  <Icons.Cancel
                    className="text-primary-light hidden h-[15px] w-[15px] group-hover:block"
                    onClick={onClickUntrack}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <div className="flex flex-1 flex-row">
                  <div className="flex-2 flex items-center justify-center pr-4">
                    <Icons.InfoLink className="text-primary-active" />
                  </div>
                  <div className="flex flex-1 flex-col">
                    <span>
                      <span className="text-white">
                        {isTracked ? 'Series is tracked' : 'Series is untracked'}
                      </span>
                    </span>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          )}
          {/* <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="hidden group-hover:inline-flex data-[state=open]:inline-flex"
              >
                <Icons.More />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent hideWhenDetached>
              <DropdownMenuItem
                onSelect={() => {
                  onThumbnailContextMenu('openDICOMTagViewer', {
                    displaySetInstanceUID,
                  });
                }}
                className="gap-[6px]"
              >
                <Icons.DicomTagBrowser />
                Tag Browser
              </DropdownMenuItem>
              {canReject && (
                <DropdownMenuItem
                  onSelect={() => {
                    onReject();
                  }}
                  className="gap-[6px]"
                >
                  <Icons.Trash className="h-5 w-5 text-red-500" />
                  Delete Report
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu> */}
        </div>
      </div>
    );
  };

  if (thumbnailType === 'thumbnailNoImage' && !isDoc) {
    return null;
  }

  return (
    <div
      className={classnames(
        className,
        'group flex cursor-pointer select-none overflow-hidden rounded outline-none',
        viewPreset === 'thumbnails' ? 'bg-black' : 'bg-primary-main/10',
        viewPreset === 'thumbnails' ? (isMobile ? 'h-[170px] w-[135px]' : 'h-[200px] w-full') : '',
        viewPreset === 'list' ? (isMobile ? 'h-[70px] w-[150px]' : 'h-[70px] w-[200px]') : ''
      )}
      id={`thumbnail-${displaySetInstanceUID}`}
      data-cy={
        thumbnailType === 'thumbnailNoImage'
          ? 'study-browser-thumbnail-no-image'
          : 'study-browser-thumbnail'
      }
      data-series={seriesNumber}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onTouchEnd={handleTouchEnd}
      role="button"
    >
      <div
        ref={drag}
        className="h-full w-full"
      >
        {viewPreset === 'thumbnails' && renderThumbnailPreset()}
        {viewPreset === 'list' && renderListPreset()}
      </div>
    </div>
  );
};

Thumbnail.propTypes = {
  displaySetInstanceUID: PropTypes.string.isRequired,
  className: PropTypes.string,
  imageSrc: PropTypes.string,
  /**
   * Data the thumbnail should expose to a receiving drop target. Use a matching
   * `dragData.type` to identify which targets can receive this draggable item.
   * If this is not set, drag-n-drop will be disabled for this thumbnail.
   *
   * Ref: https://react-dnd.github.io/react-dnd/docs/api/use-drag#specification-object-members
   */
  dragData: PropTypes.shape({
    /** Must match the "type" a dropTarget expects */
    type: PropTypes.string.isRequired,
  }),
  imageAltText: PropTypes.string,
  description: PropTypes.string.isRequired,
  seriesNumber: PropTypes.any,
  numInstances: PropTypes.number.isRequired,
  loadingProgress: PropTypes.number,
  messages: PropTypes.object,
  isActive: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
  onDoubleClick: PropTypes.func.isRequired,
  viewPreset: PropTypes.string,
  modality: PropTypes.string,
  isHydratedForDerivedDisplaySet: PropTypes.bool,
  canReject: PropTypes.bool,
  onReject: PropTypes.func,
  isTracked: PropTypes.bool,
  onClickUntrack: PropTypes.func,
  countIcon: PropTypes.string,
  thumbnailType: PropTypes.oneOf(['thumbnail', 'thumbnailTracked', 'thumbnailNoImage']),
};

export { Thumbnail };
