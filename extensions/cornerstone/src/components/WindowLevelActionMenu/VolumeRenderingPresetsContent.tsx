import { Icon } from '@ohif/ui';
import { ButtonEnums } from '@ohif/ui';
import React, { ReactElement, useState, useCallback } from 'react';
import { Button, InputFilterText } from '@ohif/ui';
import { ViewportPreset, VolumeRenderingPresetsContentProps } from '../../types/ViewportPresets';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';

export function VolumeRenderingPresetsContent({
  presets,
  viewportId,
  commandsManager,
  onClose,
}: VolumeRenderingPresetsContentProps): ReactElement {
  const { t } = useTranslation('VolumeRenderingPresets');
  const [filteredPresets, setFilteredPresets] = useState(presets);
  const [searchValue, setSearchValue] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<ViewportPreset | null>(null);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchValue(value);
      const filtered = value
        ? presets.filter(
          preset =>
            preset.name.toLowerCase().includes(value.toLowerCase()) ||
            t(preset.name).toLowerCase().includes(value.toLowerCase())
        )
        : presets;
      setFilteredPresets(filtered);
    },
    [presets, t]
  );

  const handleApply = useCallback(
    props => {
      commandsManager.runCommand('setViewportPreset', {
        ...props,
      });
    },
    [commandsManager]
  );

  const formatLabel = (label: string, maxChars: number) => {
    return label.length > maxChars ? `${label.slice(0, maxChars)}...` : label;
  };

  return (
    <div className="flex min-h-full w-full flex-col justify-between">
      <div className="border-secondary-light h-[433px] w-full overflow-hidden rounded border bg-black px-2.5">
        <div className="flex h-[46px] w-full items-center justify-start">
          <div className="h-[26px] w-[200px]">
            <InputFilterText
              value={searchValue}
              onDebounceChange={handleSearchChange}
              placeholder={t('Search all')}
            />
          </div>
        </div>
        <div className="ohif-scrollbar overflow h-[385px] w-full overflow-y-auto">
          <div className="grid grid-cols-2 gap-3 pt-2 pr-3">
            {filteredPresets.map((preset, index) => (
              <div
                key={index}
                className="flex cursor-pointer flex-col items-start"
                onClick={() => {
                  setSelectedPreset(preset);
                  handleApply({ preset: preset.name, viewportId });
                }}
              >
                <Icon
                  name={preset.name}
                  className={classNames(
                    'h-[150px] w-[190px] max-w-none rounded border-2',
                    selectedPreset?.name === preset.name
                      ? 'border-primary-light'
                      : 'hover:border-primary-light border-black'
                  )}
                />
                <label className="mt-2 text-left text-xs text-white">
                  {formatLabel(t(preset.name), 35)}
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>
      <footer className="flex h-[60px] w-full items-center justify-end">
        <div className="flex">
          <Button
            name="Cancel"
            size={ButtonEnums.size.medium}
            type={ButtonEnums.type.secondary}
            onClick={onClose}
          >
            {` ${t('Buttons:Cancel')} `}
          </Button>
        </div>
      </footer>
    </div>
  );
}
