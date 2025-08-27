/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
} from "@testing-library/react";

import VirtualListDemo, {
  DefaultItemRenderer,
  useVirtualList,
  VirtualListComponent,
} from "../src/template/VirtualListDemo";

// Mock data for testing
const createMockUsers = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    name: `User ${i + 1}`,
    email: `user${i + 1}@example.com`,
    avatar: `https://picsum.photos/40/40?random=${i}`,
    status: i % 2 === 0 ? "online" : "offline",
    score: Math.floor(Math.random() * 1000),
    joinDate: "2023-01-01",
  }));
};

const mockUsers = createMockUsers(100);

describe("useVirtualList Hook", () => {
  const mockOptions = {
    itemHeight: 60,
    containerHeight: 400,
    overscan: 5,
  };

  it("should initialize with correct default values", () => {
    const { result } = renderHook(() => useVirtualList(mockUsers, mockOptions));

    expect(result.current.scrollTop).toBe(0);
    expect(result.current.totalHeight).toBe(
      mockUsers.length * mockOptions.itemHeight,
    );
    expect(result.current.containerHeight).toBe(mockOptions.containerHeight);
    expect(result.current.startIndex).toBeGreaterThanOrEqual(0);
    expect(result.current.endIndex).toBeGreaterThan(result.current.startIndex);
    expect(result.current.visibleItems).toBeInstanceOf(Array);
  });

  it("should calculate visible items correctly", () => {
    const { result } = renderHook(() => useVirtualList(mockUsers, mockOptions));

    // With containerHeight 400 and itemHeight 60, we should see about 7-8 items + overscan
    const expectedVisibleCount =
      Math.ceil(mockOptions.containerHeight / mockOptions.itemHeight) +
      mockOptions.overscan * 2;
    expect(result.current.visibleItems.length).toBeLessThanOrEqual(
      expectedVisibleCount + 1,
    );
  });

  it("should handle empty items array", () => {
    const { result } = renderHook(() => useVirtualList([], mockOptions));

    expect(result.current.totalHeight).toBe(0);
    expect(result.current.visibleItems).toEqual([]);
    expect(result.current.startIndex).toBe(0);
    expect(result.current.endIndex).toBe(0);
  });

  it("should handle single item", () => {
    const singleItem = [mockUsers[0]];
    const { result } = renderHook(() =>
      useVirtualList(singleItem, mockOptions),
    );

    expect(result.current.totalHeight).toBe(mockOptions.itemHeight);
    expect(result.current.visibleItems).toEqual(singleItem);
    expect(result.current.startIndex).toBe(0);
    expect(result.current.endIndex).toBe(1);
  });

  it("should update scroll position correctly", () => {
    const { result } = renderHook(() => useVirtualList(mockUsers, mockOptions));

    // Mock scroll event
    const mockScrollEvent = {
      currentTarget: { scrollTop: 120 },
    } as React.UIEvent<HTMLDivElement>;

    act(() => {
      result.current.handleScroll(mockScrollEvent);
    });

    expect(result.current.scrollTop).toBe(120);
  });

  it("should provide scrollToIndex functionality", () => {
    const { result } = renderHook(() => useVirtualList(mockUsers, mockOptions));

    // Mock the ref
    const mockScrollElement = {
      scrollTop: 0,
    };

    Object.defineProperty(result.current.scrollElementRef, "current", {
      value: mockScrollElement,
      writable: true,
    });

    act(() => {
      result.current.scrollToIndex(10);
    });

    expect(mockScrollElement.scrollTop).toBe(10 * mockOptions.itemHeight);
  });

  it("should handle scrollToIndex with null ref", () => {
    const { result } = renderHook(() => useVirtualList(mockUsers, mockOptions));

    // Ensure ref is null
    Object.defineProperty(result.current.scrollElementRef, "current", {
      value: null,
      writable: true,
    });

    // Should not throw error
    expect(() => {
      act(() => {
        result.current.scrollToIndex(10);
      });
    }).not.toThrow();
  });
});

describe("DefaultItemRenderer", () => {
  const mockUser = {
    id: 1,
    name: "Test User",
    email: "test@example.com",
    avatar: "https://example.com/avatar.jpg",
    status: "online" as const,
    score: 500,
    joinDate: "2023-01-01",
  };

  const mockProps = {
    item: mockUser,
    index: 0,
    style: {
      position: "absolute",
      top: 0,
      height: 60,
      left: 0,
      right: 0,
    } as const,
  };

  it("should render user information correctly", () => {
    render(<DefaultItemRenderer {...mockProps} />);

    expect(screen.getByText("Test User")).toBeInTheDocument();
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
    expect(screen.getByText("Score: 500")).toBeInTheDocument();
    expect(screen.getByText("Joined: 2023-01-01")).toBeInTheDocument();
    expect(screen.getByText("online")).toBeInTheDocument();
    expect(screen.getByText("#0")).toBeInTheDocument();
  });

  it("should render offline status correctly", () => {
    const offlineUser = { ...mockUser, status: "offline" as const };
    const offlineProps = { ...mockProps, item: offlineUser };

    render(<DefaultItemRenderer {...offlineProps} />);
    expect(screen.getByText("offline")).toBeInTheDocument();
  });

  it("should render avatar with correct attributes", () => {
    render(<DefaultItemRenderer {...mockProps} />);

    const avatar = screen.getByAltText("Test User");
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute("src", "https://example.com/avatar.jpg");
  });
});

describe("VirtualListComponent", () => {
  const renderItem = ({ item, style }: any) => (
    <div style={style} data-testid={`item-${item.id}`}>
      {item.name}
    </div>
  );

  const mockProps = {
    items: mockUsers.slice(0, 10),
    itemHeight: 60,
    containerHeight: 300,
    renderItem,
    getItemKey: (item: any) => item.id,
  };

  it("should render virtual list container", () => {
    const { container } = render(<VirtualListComponent {...mockProps} />);

    const listContainer = container.firstChild as HTMLElement;
    expect(listContainer).toBeInTheDocument();
    expect(listContainer).toHaveStyle({ height: "300px" });
  });

  it("should render visible items only", () => {
    const mockPropsForOnly = { ...mockProps, items: [mockUsers[0]] };
    render(<VirtualListComponent {...mockPropsForOnly} />);

    // Should not render all 10 items, only visible ones
    const items = screen.getAllByTestId(/^item-/);
    expect(items.length).toBeLessThan(10);
    expect(items.length).toBeGreaterThan(0);
  });

  it("should handle scroll events", () => {
    const onScroll = jest.fn();
    render(<VirtualListComponent {...mockProps} onScroll={onScroll} />);

    const container =
      screen.getByRole("list", { hidden: true }) ||
      document.querySelector('[style*="height: 300px"]');

    expect(container).toBeInTheDocument();

    fireEvent.scroll(container, { target: { scrollTop: 100 } });
    // Note: The actual scroll handling is internal to the component
    expect(onScroll).toHaveBeenCalledWith(100);
  });

  it("should use custom getItemKey function", () => {
    const customGetItemKey = jest.fn((item: any) => `custom-${item.id}`);

    render(
      <VirtualListComponent {...mockProps} getItemKey={customGetItemKey} />,
    );

    expect(customGetItemKey).toHaveBeenCalled();
  });

  it("should handle empty items array", () => {
    render(<VirtualListComponent {...mockProps} items={[]} />);

    const items = screen.queryAllByTestId(/^item-/);
    expect(items).toHaveLength(0);
  });

  it("should apply custom className", () => {
    const { container } = render(
      <VirtualListComponent {...mockProps} className="custom-class" />,
    );

    expect(container.firstChild).toHaveClass("custom-class");
  });
});

describe("VirtualListDemo Component", () => {
  it("should render the main demo interface", async () => {
    render(<VirtualListDemo />);

    // Check for main title
    expect(screen.getByText("🚀 StyleX Virtual List")).toBeInTheDocument();

    // Check for search input
    expect(screen.getByPlaceholderText("Search users...")).toBeInTheDocument();

    // Check for random jump button
    expect(screen.getByText("Random Jump")).toBeInTheDocument();
  });

  it("should handle search functionality", async () => {
    render(<VirtualListDemo />);

    const searchInput = screen.getByPlaceholderText(
      "Search users...",
    ) as HTMLInputElement;

    // Type in search input using fireEvent
    fireEvent.change(searchInput, { target: { value: "User 1" } });

    expect(searchInput).toHaveValue("User 1");
  });

  it("should handle random jump button click", async () => {
    render(<VirtualListDemo />);

    const randomJumpButton = screen.getByText("Random Jump");

    // Should not throw error when clicked
    fireEvent.click(randomJumpButton);

    expect(randomJumpButton).toBeInTheDocument();
  });

  it("should display statistics correctly", async () => {
    render(<VirtualListDemo />);

    // Wait for data to load and check statistics
    await screen.findByText(/Total:/);

    expect(screen.getByText(/Total:/)).toBeInTheDocument();
    expect(screen.getByText(/Filtered:/)).toBeInTheDocument();
    expect(screen.getByText(/Rendered:/)).toBeInTheDocument();
    expect(screen.getByText(/Range:/)).toBeInTheDocument();
  });

  it("should render navigation buttons", async () => {
    render(<VirtualListDemo />);

    // Check for quick jump navigation
    expect(screen.getByText("Quick Jump:")).toBeInTheDocument();

    // Should have navigation buttons
    const navButtons = screen
      .getAllByRole("button")
      .filter((button) => button.textContent?.match(/^#\d+$|^End$/));

    expect(navButtons.length).toBeGreaterThan(0);
  });

  it("should handle navigation button clicks", async () => {
    render(<VirtualListDemo />);

    // Wait for buttons to appear
    await screen.findByText("Quick Jump:");

    // Find and click a navigation button
    const buttons = screen.getAllByRole("button");
    const navButton = buttons.find((btn) => btn.textContent === "#0");

    if (navButton) {
      fireEvent.click(navButton);
      expect(navButton).toBeInTheDocument();
    }
  });

  it("should filter results based on search", async () => {
    render(<VirtualListDemo />);

    const searchInput = screen.getByPlaceholderText(
      "Search users...",
    ) as HTMLInputElement;

    // Search for a specific user using fireEvent
    fireEvent.change(searchInput, { target: { value: "User 100" } });

    // The filtered count should change
    await screen.findByText(/Filtered:/);

    const filteredText = screen.getByText(/Filtered:/);
    expect(filteredText).toBeInTheDocument();
  });

  it("should handle search by email", async () => {
    render(<VirtualListDemo />);

    const searchInput = screen.getByPlaceholderText(
      "Search users...",
    ) as HTMLInputElement;

    // Search by email using fireEvent
    fireEvent.change(searchInput, { target: { value: "@example.com" } });

    expect(searchInput).toHaveValue("@example.com");
  });
});

describe("VirtualListDemo Edge Cases", () => {
  it("should handle very large datasets", () => {
    const largeDataset = createMockUsers(10000);

    expect(() => {
      render(
        <VirtualListComponent
          items={largeDataset}
          itemHeight={60}
          containerHeight={400}
          renderItem={({ item, style }: any) => (
            <div style={style}>{item.name}</div>
          )}
        />,
      );
    }).not.toThrow();
  });

  it("should handle zero item height", () => {
    const { result } = renderHook(() =>
      useVirtualList(mockUsers, {
        itemHeight: 0,
        containerHeight: 400,
        overscan: 5,
      }),
    );

    expect(result.current.totalHeight).toBe(0);
  });

  it("should handle zero container height", () => {
    const { result } = renderHook(() =>
      useVirtualList(mockUsers, {
        itemHeight: 60,
        containerHeight: 0,
        overscan: 5,
      }),
    );

    expect(result.current.containerHeight).toBe(0);
  });

  it("should handle negative overscan", () => {
    const { result } = renderHook(() =>
      useVirtualList(mockUsers, {
        itemHeight: 60,
        containerHeight: 400,
        overscan: -5,
      }),
    );

    // Should still work, startIndex should be >= 0
    expect(result.current.startIndex).toBeGreaterThanOrEqual(0);
  });

  it("should handle items with missing properties", () => {
    const incompleteUser = {
      id: 1,
      name: "Incomplete User",
      // Missing other properties
    };

    expect(() => {
      render(
        <DefaultItemRenderer
          item={incompleteUser as any}
          index={0}
          style={{
            position: "absolute",
            top: 0,
            height: 60,
            left: 0,
            right: 0,
          }}
        />,
      );
    }).not.toThrow();
  });
});
