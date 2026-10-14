/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CSSProperties } from "react";
import type { Meta, StoryObj } from "storybook-react-rsbuild";

import VirtualListDemo, {
  DefaultItemRenderer,
  useVirtualList,
  VirtualListComponent,
} from "../dist/template/VirtualListDemo";

const storyStyles: Record<string, CSSProperties> = {
  storyContainer: {
    padding: "20px",
    fontFamily: "system-ui, sans-serif",
  },
  buttonGroup: {
    display: "flex",
    gap: "8px",
    marginBottom: "16px",
  },
  button: {
    padding: "8px 16px",
    backgroundColor: "#3b82f6",
    color: "#ffffff",
    borderWidth: 0,
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
  },
  info: {
    fontSize: "14px",
    color: "#6b7280",
    marginBottom: "12px",
  },
  compactItem: {
    display: "flex",
    alignItems: "center",
    padding: "8px 12px",
    borderBottom: "1px solid #f3f4f6",
    fontSize: "13px",
  },
  avatar: {
    width: "24px",
    height: "24px",
    backgroundColor: "#e5e7eb",
    borderRadius: "50%",
    marginRight: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "10px",
    fontWeight: "bold",
  },
};

interface DemoUser {
  id: number;
  name: string;
  email: string;
  avatar: string;
  status: "online" | "offline";
  score: number;
  joinDate: string;
}

const generateUsers = (count: number): DemoUser[] => {
  return Array.from({ length: count }, (_, i) => ({
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
};

const CompactRenderer = ({ item, style }: any) => (
  <div style={{ ...storyStyles.compactItem, ...style }}>
    <div style={storyStyles.avatar}>{item.name.charAt(0)}</div>
    <div style={{ flex: 1 }}>{item.name}</div>
    <div style={{ color: "#9ca3af", fontSize: "12px" }}>{item.email}</div>
  </div>
);

const meta: Meta<typeof VirtualListComponent> = {
  title: "Template/VirtualListDemo",
  component: VirtualListComponent,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: `
A high-performance virtual list component built with StyleX for styling.

## Features
- 🎨 **StyleX Integration** - Type-safe, performant CSS-in-JS
- 🚀 **High Performance** - Handles 10k+ items smoothly  
- 🎯 **TypeScript Support** - Full type safety
- 🔧 **Flexible API** - Both Hook and Component patterns
- 📱 **Responsive Design** - Works on all screen sizes

## StyleX Benefits
- Zero runtime CSS parsing
- Atomic CSS generation
- Type-safe styles
- Optimal bundle size
        `,
      },
    },
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

// const smallDataset = generateUsers(100);
const mediumDataset = generateUsers(1000);
const largeDataset = generateUsers(10000);

export const Default: Story = {
  args: {
    items: mediumDataset,
    itemHeight: 60,
    containerHeight: 400,
    renderItem: DefaultItemRenderer as any,
    getItemKey: ((item: DemoUser) => item.id) as any,
    overscan: 5,
  },
  render: (args) => (
    <div style={storyStyles.storyContainer}>
      <VirtualListComponent {...args} />
    </div>
  ),
};

export const CompactLayout: Story = {
  args: {
    items: mediumDataset,
    itemHeight: 40,
    containerHeight: 320,
    renderItem: CompactRenderer,
    getItemKey: (item: any) => item.id,
    overscan: 3,
  },
  render: (args) => (
    <div style={storyStyles.storyContainer}>
      <VirtualListComponent {...args} />
    </div>
  ),
};

export const WithNavigation: Story = {
  render: (args) => {
    const HookExample = () => {
      const virtualList = useVirtualList(args.items, {
        itemHeight: args.itemHeight,
        containerHeight: args.containerHeight,
        overscan: args.overscan,
      });

      return (
        <div style={storyStyles.storyContainer}>
          <div style={storyStyles.buttonGroup}>
            <button
              style={storyStyles.button}
              onClick={() => virtualList.scrollToIndex(0)}
            >
              Go to Top
            </button>
            <button
              style={storyStyles.button}
              onClick={() =>
                virtualList.scrollToIndex(Math.floor(args.items.length / 2))
              }
            >
              Go to Middle
            </button>
            <button
              style={storyStyles.button}
              onClick={() => virtualList.scrollToIndex(args.items.length - 1)}
            >
              Go to End
            </button>
          </div>

          <div style={storyStyles.info}>
            Showing items {virtualList.startIndex}-{virtualList.endIndex} of{" "}
            {args.items.length}
          </div>

          <div
            ref={virtualList.scrollElementRef}
            onScroll={virtualList.handleScroll}
            style={{
              height: virtualList.containerHeight,
              overflow: "auto",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
            }}
          >
            <div
              style={{ height: virtualList.totalHeight, position: "relative" }}
            >
              {virtualList.visibleItems.map((item, index) =>
                args.renderItem({
                  item,
                  index: virtualList.startIndex + index,
                  style: {
                    position: "absolute",
                    top: (virtualList.startIndex + index) * args.itemHeight,
                    height: args.itemHeight,
                    left: 0,
                    right: 0,
                  },
                }),
              )}
            </div>
          </div>
        </div>
      );
    };

    return <HookExample />;
  },
  args: {
    items: mediumDataset,
    itemHeight: 60,
    containerHeight: 400,
    renderItem: DefaultItemRenderer as any,
    overscan: 5,
  },
};

export const PerformanceTest: Story = {
  args: {
    items: largeDataset,
    itemHeight: 60,
    containerHeight: 500,
    renderItem: DefaultItemRenderer as any,
    getItemKey: (item: any) => item.id,
  },
  render: (args) => (
    <div style={storyStyles.storyContainer}>
      <div style={storyStyles.info}>
        📊 Performance Test: {args.items.length.toLocaleString()} items
      </div>
      <VirtualListComponent {...args} />
    </div>
  ),
};

export const DefaultDemo: Story = {
  render: () => <VirtualListDemo />,
};
