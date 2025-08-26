/* eslint-disable @typescript-eslint/no-explicit-any */
import * as stylex from "@stylexjs/stylex";
import {
  CSSProperties,
  JSX,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

const styles = stylex.create({
  container: {
    width: "100%",
    overflow: "auto",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
  },
  inner: {
    position: "relative",
  },
  item: {
    position: "absolute",
    left: 0,
    right: 0,
    display: "flex",
    alignItems: "center",
    padding: "12px 16px",
    borderBottom: "1px solid #f3f4f6",
    backgroundColor: "#ffffff",
    ":hover": {
      backgroundColor: "#f9fafb",
    },
    transition: "background-color 0.2s",
  },
  avatar: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    objectFit: "cover",
    marginRight: "12px",
  },
  content: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
  name: {
    fontWeight: 500,
    fontSize: "14px",
    color: "#111827",
    marginBottom: "4px",
  },
  email: {
    fontSize: "12px",
    color: "#6b7280",
  },
  status: {
    padding: "4px 8px",
    borderRadius: "12px",
    fontSize: "11px",
    fontWeight: 500,
    textAlign: "center",
  },
  statusOnline: {
    backgroundColor: "#dcfce7",
    color: "#166534",
  },
  statusOffline: {
    backgroundColor: "#f3f4f6",
    color: "#4b5563",
  },
  info: {
    textAlign: "right",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  score: {
    fontSize: "12px",
    fontWeight: 500,
    color: "#111827",
  },
  date: {
    fontSize: "10px",
    color: "#9ca3af",
  },
  index: {
    fontSize: "10px",
    color: "#d1d5db",
    width: "64px",
    textAlign: "right",
  },
  // Demo styles
  demoContainer: {
    width: "100%",
    maxWidth: "1024px",
    margin: "0 auto",
    padding: "24px",
    backgroundColor: "#f9fafb",
    minHeight: "100vh",
  },
  title: {
    fontSize: "32px",
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: "24px",
    textAlign: "center",
  },
  controls: {
    marginBottom: "24px",
    padding: "16px",
    backgroundColor: "#ffffff",
    borderRadius: "8px",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
  },
  controlsRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "16px",
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    minWidth: "256px",
    padding: "8px 16px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    fontSize: "14px",
    ":focus": {
      outline: "none",
      borderColor: "#3b82f6",
      boxShadow: "0 0 0 2px rgba(59, 130, 246, 0.1)",
    },
  },
  button: {
    padding: "8px 16px",
    backgroundColor: "#3b82f6",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: 500,
    cursor: "pointer",
    ":hover": {
      backgroundColor: "#2563eb",
    },
    transition: "background-color 0.2s",
  },
  stats: {
    marginTop: "16px",
    display: "flex",
    flexWrap: "wrap",
    gap: "16px",
    fontSize: "12px",
    color: "#6b7280",
  },
  listContainer: {
    backgroundColor: "#ffffff",
    borderRadius: "8px",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
    overflow: "hidden",
  },
  navigation: {
    marginTop: "16px",
    padding: "16px",
    backgroundColor: "#ffffff",
    borderRadius: "8px",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
  },
  navTitle: {
    fontWeight: 500,
    marginBottom: "8px",
    fontSize: "14px",
  },
  navButtons: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },
  navButton: {
    padding: "4px 12px",
    backgroundColor: "#f3f4f6",
    border: "none",
    borderRadius: "4px",
    fontSize: "12px",
    cursor: "pointer",
    ":hover": {
      backgroundColor: "#e5e7eb",
    },
    ":disabled": {
      opacity: 0.5,
      cursor: "not-allowed",
    },
    transition: "background-color 0.2s",
  },
});

// Type definitions (same as before)
// interface VirtualListItem<T = any> {
//   key: string | number;
//   index: number;
//   item: T;
//   style: CSSProperties;
// }

interface RenderItemProps<T = any> {
  item: T;
  index: number;
  style: CSSProperties;
}

interface VirtualListProps<T = any> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (props: RenderItemProps<T>) => ReactNode;
  getItemKey?: (item: T, index: number) => string | number;
  overscan?: number;
  className?: string;
  onScroll?: (scrollTop: number) => void;
}

interface UseVirtualListOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

interface UseVirtualListReturn<T = any> {
  scrollElementRef: React.RefObject<HTMLDivElement | null>;
  scrollTop: number;
  handleScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  visibleItems: T[];
  startIndex: number;
  endIndex: number;
  totalHeight: number;
  scrollToIndex: (index: number) => void;
  containerHeight: number;
}

interface DemoUser {
  id: number;
  name: string;
  email: string;
  avatar: string;
  status: "online" | "offline";
  score: number;
  joinDate: string;
}

// Hook version
const useVirtualList = <T,>(
  items: T[],
  options: UseVirtualListOptions,
): UseVirtualListReturn<T> => {
  const { itemHeight, containerHeight, overscan = 5 } = options;

  const [scrollTop, setScrollTop] = useState<number>(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan,
  );

  const visibleItems = items.slice(startIndex, endIndex);
  const totalHeight = items.length * itemHeight;

  const scrollToIndex = useCallback(
    (index: number) => {
      if (scrollElementRef.current) {
        scrollElementRef.current.scrollTop = index * itemHeight;
      }
    },
    [itemHeight],
  );

  return {
    scrollElementRef,
    scrollTop,
    handleScroll,
    visibleItems,
    startIndex,
    endIndex,
    totalHeight,
    scrollToIndex,
    containerHeight,
  };
};

// Component version
const VirtualListComponent = <T,>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  getItemKey,
  overscan = 5,
  className = "",
}: VirtualListProps<T>): JSX.Element => {
  const virtualList = useVirtualList(items, {
    itemHeight,
    containerHeight,
    overscan,
  });

  return (
    <div
      {...stylex.props(styles.container)}
      className={className}
      ref={virtualList.scrollElementRef}
      onScroll={virtualList.handleScroll}
      style={{ height: containerHeight }}
    >
      <div
        {...stylex.props(styles.inner)}
        style={{ height: virtualList.totalHeight }}
      >
        {virtualList.visibleItems.map((item, index) => {
          const itemIndex = virtualList.startIndex + index;
          const itemKey = getItemKey ? getItemKey(item, itemIndex) : itemIndex;

          return (
            <div key={itemKey}>
              {renderItem({
                item,
                index: itemIndex,
                style: {
                  position: "absolute",
                  top: itemIndex * itemHeight,
                  height: itemHeight,
                  left: 0,
                  right: 0,
                },
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Default item renderer with StyleX
const DefaultItemRenderer = <T extends DemoUser>({
  item,
  index,
  style,
}: RenderItemProps<T>): ReactNode => (
  <div {...stylex.props(styles.item)} style={style}>
    <img {...stylex.props(styles.avatar)} src={item.avatar} alt={item.name} />
    <div {...stylex.props(styles.content)}>
      <div {...stylex.props(styles.name)}>{item.name}</div>
      <div {...stylex.props(styles.email)}>{item.email}</div>
    </div>
    <div {...stylex.props(styles.info)}>
      <div {...stylex.props(styles.score)}>Score: {item.score}</div>
      <div {...stylex.props(styles.date)}>Joined: {item.joinDate}</div>
    </div>
    <div
      {...stylex.props(
        styles.status,
        item.status === "online" ? styles.statusOnline : styles.statusOffline,
      )}
    >
      {item.status}
    </div>
    <div {...stylex.props(styles.index)}>#{index}</div>
  </div>
);

// Demo component
const VirtualListDemo: React.FC = () => {
  const [data, setData] = useState<DemoUser[]>([]);
  const [filteredData, setFilteredData] = useState<DemoUser[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Generate demo data
  useEffect(() => {
    const items: DemoUser[] = Array.from({ length: 10000 }, (_, i) => ({
      id: i,
      name: `User ${i + 1}`,
      email: `user${i + 1}@example.com`,
      avatar: `https://picsum.photos/40/40?random=${i}`,
      status: Math.random() > 0.5 ? "online" : "offline",
      score: Math.floor(Math.random() * 1000),
      joinDate: new Date(
        2020 + Math.floor(Math.random() * 4),
        Math.floor(Math.random() * 12),
        Math.floor(Math.random() * 28),
      ).toLocaleDateString(),
    }));
    setData(items);
    setFilteredData(items);
  }, []);

  // Filter data
  useEffect(() => {
    const filtered = data.filter(
      (item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.email.toLowerCase().includes(searchTerm.toLowerCase()),
    );
    setFilteredData(filtered);
  }, [data, searchTerm]);

  const virtualList = useVirtualList<DemoUser>(filteredData, {
    itemHeight: 60,
    containerHeight: 400,
    overscan: 3,
  });

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleRandomJump = () => {
    const randomIndex = Math.floor(Math.random() * filteredData.length);
    virtualList.scrollToIndex(randomIndex);
  };

  return (
    <div {...stylex.props(styles.demoContainer)}>
      <h1 {...stylex.props(styles.title)}>🚀 StyleX Virtual List</h1>

      <div {...stylex.props(styles.controls)}>
        <div {...stylex.props(styles.controlsRow)}>
          <input
            {...stylex.props(styles.searchInput)}
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
          <button
            {...stylex.props(styles.button)}
            onClick={handleRandomJump}
            type="button"
          >
            Random Jump
          </button>
        </div>

        <div {...stylex.props(styles.stats)}>
          <span>Total: {data.length.toLocaleString()}</span>
          <span>Filtered: {filteredData.length.toLocaleString()}</span>
          <span>Rendered: {virtualList.visibleItems.length}</span>
          <span>
            Range: {virtualList.startIndex}-{virtualList.endIndex}
          </span>
        </div>
      </div>

      <div {...stylex.props(styles.listContainer)}>
        <div
          ref={virtualList.scrollElementRef}
          onScroll={virtualList.handleScroll}
          {...stylex.props(styles.container)}
          style={{ height: virtualList.containerHeight }}
        >
          <div
            {...stylex.props(styles.inner)}
            style={{ height: virtualList.totalHeight }}
          >
            {virtualList.visibleItems.map((item, index) => (
              <DefaultItemRenderer
                key={item.id}
                item={item}
                index={virtualList.startIndex + index}
                style={{
                  position: "absolute",
                  top: (virtualList.startIndex + index) * 60,
                  height: 60,
                  left: 0,
                  right: 0,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <div {...stylex.props(styles.navigation)}>
        <h3 {...stylex.props(styles.navTitle)}>Quick Jump:</h3>
        <div {...stylex.props(styles.navButtons)}>
          {[
            0,
            1000,
            2000,
            5000,
            8000,
            Math.max(0, filteredData.length - 1),
          ].map((index) => (
            <button
              key={index}
              {...stylex.props(styles.navButton)}
              onClick={() => virtualList.scrollToIndex(index)}
              disabled={index >= filteredData.length}
              type="button"
            >
              {index === filteredData.length - 1 ? "End" : `#${index}`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VirtualListDemo;
export { DefaultItemRenderer, useVirtualList, VirtualListComponent };
