import React, { useState } from 'react';
import classnames from 'classnames';
import PropTypes from 'prop-types';

const flex = 'flex flex-row justify-between items-center';
const theme = 'bg-secondary-dark text-white';

// Defined outside ListMenu on purpose: declaring it inside the render body makes
// it a brand new component type on every render, so React remounts each row and
// any state a custom `renderer` holds is thrown away (eg. a slider resetting
// whenever the parent re-renders on hover).
const ListItem = ({ item, index, isSelected, renderer, onSelect }) => {
  const onClickHandler = () => {
    onSelect(item, index);
    item.onClick?.({ ...item, index, isSelected });
  };

  return (
    <div
      className={classnames(flex, theme, {
        'cursor-pointer': !item.disabled,
        'ohif-disabled': item.disabled,
      })}
      onClick={onClickHandler}
      data-cy={item.id}
    >
      {renderer && renderer({ ...item, index, isSelected })}
    </div>
  );
};

const ListMenu = ({ items = [], renderer, onClick = () => {} }) => {
  const [selectedIndex, setSelectedIndex] = useState(null);

  const onSelect = (item, index) => {
    setSelectedIndex(index);
    onClick({ item, selectedIndex: index });
  };

  return (
    <div
      className="bg-secondary-dark border-secondary-light flex flex-col gap-[4px] overflow-auto rounded-md border p-1"
      style={{ maxHeight: 'calc(100dvh - 5rem)' }}
    >
      {items.map((item, index) => {
        return (
          <ListItem
            key={`ListItem${index}`}
            index={index}
            isSelected={selectedIndex === index}
            item={item}
            renderer={renderer}
            onSelect={onSelect}
          />
        );
      })}
    </div>
  );
};

ListMenu.propTypes = {
  items: PropTypes.array.isRequired,
  renderer: PropTypes.func.isRequired,
  onClick: PropTypes.func,
};

export default ListMenu;
