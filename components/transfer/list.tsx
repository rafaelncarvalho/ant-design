import DownOutlined from '@ant-design/icons/DownOutlined';
import classNames from 'classnames';
import omit from 'rc-util/lib/omit';
import * as React from 'react';
import Checkbox from '../checkbox';
import Dropdown from '../dropdown';
import type { MenuProps } from '../menu';
import { isValidElement } from '../_util/reactNode';
import { groupKeysMap } from '../_util/transKeys';
import type {
  KeyWiseTransferItem,
  RenderResult,
  RenderResultObject,
  SelectAllLabel,
  TransferDirection,
  TransferLocale,
} from './index';
import type { PaginationType } from './interface';
import type { ListBodyRef, TransferListBodyProps } from './ListBody';
import DefaultListBody, { OmitProps } from './ListBody';
import Search from './search';

const defaultRender = () => null;

function isRenderResultPlainObject(result: RenderResult): result is RenderResultObject {
  return !!(
    result &&
    !isValidElement(result) &&
    Object.prototype.toString.call(result) === '[object Object]'
  );
}

function getEnabledItemKeys<RecordType extends KeyWiseTransferItem>(items: RecordType[]) {
  return items.filter((data) => !data.disabled).map((data) => data.key);
}

export interface RenderedItem<RecordType> {
  renderedText: string;
  renderedEl: React.ReactNode;
  item: RecordType;
}

type RenderListFunction<T> = (props: TransferListBodyProps<T>) => React.ReactNode;

export interface TransferListProps<RecordType> extends TransferLocale {
  prefixCls: string;
  titleText: React.ReactNode;
  dataSource: RecordType[];
  filterOption?: (filterText: string, item: RecordType) => boolean;
  style?: React.CSSProperties;
  checkedKeys: string[];
  handleFilter: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onItemSelect: (key: string, check: boolean) => void;
  onItemSelectAll: (dataSource: string[], checkAll: boolean) => void;
  onItemRemove?: (keys: string[]) => void;
  handleClear: () => void;
  /** Render item */
  render?: (item: RecordType) => RenderResult;
  showSearch?: boolean;
  searchPlaceholder: string;
  itemUnit: string;
  itemsUnit: string;
  renderList?: RenderListFunction<RecordType>;
  footer?: (
    props: TransferListProps<RecordType>,
    info?: { direction: TransferDirection },
  ) => React.ReactNode;
  onScroll: (e: React.UIEvent<HTMLUListElement, UIEvent>) => void;
  disabled?: boolean;
  direction: TransferDirection;
  showSelectAll?: boolean;
  selectAllLabel?: SelectAllLabel;
  showRemove?: boolean;
  pagination?: PaginationType;
}

const TransferList = <RecordType extends KeyWiseTransferItem>(
  props: TransferListProps<RecordType>,
) => {
  const {
    prefixCls,
    dataSource = [],
    titleText = '',
    checkedKeys,
    disabled,
    showSearch = false,
    style,
    searchPlaceholder,
    notFoundContent,
    selectAll,
    selectCurrent,
    selectInvert,
    removeAll,
    removeCurrent,
    showSelectAll = true,
    showRemove,
    pagination,
    direction,
    itemsUnit,
    itemUnit,
    selectAllLabel,
    footer,
    renderList,
    onItemSelectAll,
    onItemRemove,
    handleFilter,
    handleClear,
    filterOption,
    render = defaultRender,
  } = props;

  const [filterValue, setFilterValue] = React.useState<string>('');

  const defaultListBodyRef = React.useRef<ListBodyRef<RecordType>>({});

  const getCheckStatus = (filteredItems: RecordType[]) => {
    if (checkedKeys.length === 0) {
      return 'none';
    }
    const checkedKeysMap = groupKeysMap(checkedKeys);
    if (filteredItems.every((item) => checkedKeysMap.has(item.key) || !!item.disabled)) {
      return 'all';
    }
    return 'part';
  };

  const internalHandleFilter = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterValue(e.target.value);
    handleFilter(e);
  };

  const internalHandleClear = () => {
    setFilterValue('');
    handleClear();
  };

  const matchFilter = (text: string, item: RecordType) => {
    if (filterOption) {
      return filterOption(filterValue, item);
    }
    return text.includes(filterValue);
  };

  const renderListBody = (listProps: TransferListBodyProps<RecordType>) => {
    let bodyContent: React.ReactNode = renderList ? renderList(listProps) : null;
    const customize: boolean = !!bodyContent;
    if (!customize) {
      bodyContent = <DefaultListBody ref={defaultListBodyRef} {...listProps} />;
    }
    return { customize, bodyContent };
  };

  const renderItem = (item: RecordType): RenderedItem<RecordType> => {
    const renderResult = render(item);
    const isRenderResultPlain = isRenderResultPlainObject(renderResult);
    return {
      renderedText: isRenderResultPlain
        ? (renderResult as RenderResultObject).value
        : (renderResult as string),
      renderedEl: isRenderResultPlain ? (renderResult as RenderResultObject).label : renderResult,
      item,
    };
  };

  const memoizedFilteredItems = React.useMemo(() => {
    const filteredItems: RecordType[] = [];
    const filteredRenderItems: RenderedItem<RecordType>[] = [];
    dataSource.forEach((item) => {
      const renderedItem = renderItem(item);
      const { renderedText } = renderedItem;
      if (filterValue && !matchFilter(renderedText, item)) {
        return;
      }
      filteredItems.push(item);
      filteredRenderItems.push(renderedItem);
    });
    return [filteredItems, filteredRenderItems] as const;
  }, [dataSource]);

  const getListBody = (
    filteredItems: RecordType[],
    filteredRenderItems: RenderedItem<RecordType>[],
  ): React.ReactNode => {
    const search = showSearch ? (
      <div className={`${prefixCls}-body-search-wrapper`}>
        <Search
          prefixCls={`${prefixCls}-search`}
          onChange={internalHandleFilter}
          handleClear={internalHandleClear}
          placeholder={searchPlaceholder}
          value={filterValue}
          disabled={disabled}
        />
      </div>
    ) : null;

    const { bodyContent, customize } = renderListBody({
      ...omit(props, OmitProps),
      filteredItems,
      filteredRenderItems,
      selectedKeys: checkedKeys,
    });

    const getNotFoundContent = () =>
      Array.isArray(notFoundContent)
        ? notFoundContent[direction === 'left' ? 0 : 1]
        : notFoundContent;

    let bodyNode: React.ReactNode;
    // We should wrap customize list body in a classNamed div to use flex layout.
    if (customize) {
      bodyNode = <div className={`${prefixCls}-body-customize-wrapper`}>{bodyContent}</div>;
    } else {
      bodyNode = filteredItems.length ? (
        bodyContent
      ) : (
        <div className={`${prefixCls}-body-not-found`}>{getNotFoundContent()}</div>
      );
    }

    return (
      <div
        className={classNames(
          showSearch ? `${prefixCls}-body ${prefixCls}-body-with-search` : `${prefixCls}-body`,
        )}
      >
        {search}
        {bodyNode}
      </div>
    );
  };

  const getCheckBox = (items: RecordType[]): React.ReactNode => {
    const checkStatus = getCheckStatus(items);
    const checkedAll = checkStatus === 'all';
    const checkAllCheckbox: React.ReactNode = (
      <Checkbox
        disabled={disabled}
        checked={checkedAll}
        indeterminate={checkStatus === 'part'}
        className={`${prefixCls}-checkbox`}
        onChange={() => {
          // Only select enabled items
          onItemSelectAll(
            items.filter((item) => !item.disabled).map(({ key }) => key),
            !checkedAll,
          );
        }}
      />
    );
    return checkAllCheckbox;
  };

  const getSelectAllLabel = (selectedCount: number, totalCount: number): React.ReactNode => {
    if (selectAllLabel) {
      return typeof selectAllLabel === 'function'
        ? selectAllLabel({ selectedCount, totalCount })
        : selectAllLabel;
    }
    const unit = totalCount > 1 ? itemsUnit : itemUnit;
    return (
      <>
        {(selectedCount > 0 ? `${selectedCount}/` : '') + totalCount} {unit}
      </>
    );
  };

  // Custom Layout
  const footerDom = footer && (footer.length < 2 ? footer(props) : footer(props, { direction }));

  const listCls = classNames(prefixCls, {
    [`${prefixCls}-with-pagination`]: !!pagination,
    [`${prefixCls}-with-footer`]: !!footerDom,
  });

  // ====================== Get filtered, checked item list ======================

  const [filteredItems, filteredRenderItems] = memoizedFilteredItems;

  const listBody = getListBody(filteredItems, filteredRenderItems);

  const listFooter = footerDom ? <div className={`${prefixCls}-footer`}>{footerDom}</div> : null;

  const checkAllCheckbox = !showRemove && !pagination && getCheckBox(filteredItems);

  let items: MenuProps['items'];

  if (showRemove) {
    items = [
      /* Remove Current Page */
      pagination
        ? {
            key: 'removeCurrent',
            label: removeCurrent,
            onClick() {
              const pageKeys = getEnabledItemKeys(
                (defaultListBodyRef.current?.items || []).map((entity) => entity.item),
              );
              onItemRemove?.(pageKeys);
            },
          }
        : null,
      /* Remove All */
      {
        key: 'removeAll',
        label: removeAll,
        onClick() {
          onItemRemove?.(getEnabledItemKeys(filteredItems));
        },
      },
    ].filter(Boolean);
  } else {
    items = [
      {
        key: 'selectAll',
        label: selectAll,
        onClick() {
          const keys = getEnabledItemKeys(filteredItems);
          onItemSelectAll(keys, keys.length !== checkedKeys.length);
        },
      },
      pagination
        ? {
            key: 'selectCurrent',
            label: selectCurrent,
            onClick() {
              const pageItems = defaultListBodyRef.current?.items || [];
              onItemSelectAll(getEnabledItemKeys(pageItems.map((entity) => entity.item)), true);
            },
          }
        : null,
      {
        key: 'selectInvert',
        label: selectInvert,
        onClick() {
          const availableKeys = getEnabledItemKeys(
            pagination
              ? (defaultListBodyRef.current?.items || []).map((entity) => entity.item)
              : filteredItems,
          );
          const checkedKeySet = new Set<string>(checkedKeys);
          const newCheckedKeys: string[] = [];
          const newUnCheckedKeys: string[] = [];
          availableKeys.forEach((key) => {
            if (checkedKeySet.has(key)) {
              newUnCheckedKeys.push(key);
            } else {
              newCheckedKeys.push(key);
            }
          });
          onItemSelectAll(newCheckedKeys, true);
          onItemSelectAll(newUnCheckedKeys, false);
        },
      },
    ];
  }

  const dropdown = (
    <Dropdown className={`${prefixCls}-header-dropdown`} menu={{ items }} disabled={disabled}>
      <DownOutlined />
    </Dropdown>
  );

  return (
    <div className={listCls} style={style}>
      {/* Header */}
      <div className={`${prefixCls}-header`}>
        {showSelectAll ? (
          <>
            {checkAllCheckbox}
            {dropdown}
          </>
        ) : null}
        <span className={`${prefixCls}-header-selected`}>
          {getSelectAllLabel(checkedKeys.length, filteredItems.length)}
        </span>
        <span className={`${prefixCls}-header-title`}>{titleText}</span>
      </div>
      {listBody}
      {listFooter}
    </div>
  );
};

if (process.env.NODE_ENV !== 'production') {
  TransferList.displayName = 'TransferList';
}

export default TransferList;
