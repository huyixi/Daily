const pad = (value, length = 2) => String(value).padStart(length, "0");

const toMonthKey = (year, month) => `${pad(year, 4)}-${pad(month, 2)}`;

const parseMonthKey = (key) => {
  const [yearPart, monthPart] = key.split("-");
  return {
    year: Number(yearPart),
    month: Number(monthPart),
  };
};

const compareMonthKey = (a, b) => a.localeCompare(b);

const clampMonthKey = (key, minKey, maxKey) => {
  if (minKey && compareMonthKey(key, minKey) < 0) return minKey;
  if (maxKey && compareMonthKey(key, maxKey) > 0) return maxKey;
  return key;
};

const addMonths = (year, month, offset) => {
  const date = new Date(year, month - 1, 1);
  date.setMonth(date.getMonth() + offset);
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
  };
};

const buildCalendarMatrix = (year, month) => {
  const firstDay = new Date(year, month - 1, 1);
  const startOffset = firstDay.getDay(); // Sunday-first
  const startDate = new Date(firstDay);
  startDate.setDate(1 - startOffset);
  const matrix = [];

  for (let week = 0; week < 6; week += 1) {
    const row = [];
    for (let day = 0; day < 7; day += 1) {
      const cellDate = new Date(startDate);
      cellDate.setDate(startDate.getDate() + week * 7 + day);
      row.push(cellDate);
    }
    matrix.push(row);
  }

  while (matrix.length > 0) {
    const lastWeek = matrix[matrix.length - 1];
    const hasCurrentMonthDay = lastWeek.some(
      (date) => date.getMonth() === month - 1,
    );
    if (hasCurrentMonthDay) break;
    matrix.pop();
  }

  return matrix;
};

const parseISODate = (isoDate) => {
  if (!isoDate || typeof isoDate !== "string") return null;
  const [year, month, day] = isoDate.split("-").map(Number);
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  )
    return null;
  return new Date(year, month - 1, day);
};

const createElement = (tag, options = {}, children = []) => {
  const el = document.createElement(tag);
  const { className, dataset, attrs } = options;

  if (className) el.className = className;
  if (dataset) {
    Object.entries(dataset).forEach(([key, value]) => {
      el.dataset[key] = value;
    });
  }
  if (attrs) {
    Object.entries(attrs).forEach(([key, value]) => {
      if (value === false || value === null || value === undefined) return;
      if (value === true) {
        el.setAttribute(key, "");
      } else {
        el.setAttribute(key, value);
      }
    });
  }

  const childArray = Array.isArray(children) ? children : [children];
  childArray.forEach((child) => {
    if (child === null || child === undefined) return;
    if (child instanceof Node) {
      el.appendChild(child);
    } else {
      el.appendChild(document.createTextNode(String(child)));
    }
  });

  return el;
};

const sanitizePage = (page) => {
  if (!page || typeof page !== "object") return null;
  return {
    title: typeof page.title === "string" ? page.title : "",
    content: typeof page.content === "string" ? page.content : "",
  };
};

const parseMonthData = (rawMonth) => {
  if (!rawMonth || typeof rawMonth !== "object") return null;
  const year = Number(rawMonth.year);
  const month = Number(rawMonth.month);
  if (!Number.isInteger(year) || !Number.isInteger(month)) return null;

  const entry = {
    key: toMonthKey(year, month),
    year,
    month,
    days: [],
    pagesByDay: new Map(),
  };

  const rawDays = Array.isArray(rawMonth.days) ? rawMonth.days : [];
  rawDays.forEach((day) => {
    if (!day || typeof day !== "object") return;
    const iso = day.date;
    if (typeof iso !== "string") return;

    const pages = Array.isArray(day.pages)
      ? day.pages.map(sanitizePage).filter(Boolean)
      : [];

    entry.days.push(iso);
    entry.pagesByDay.set(iso, pages);
  });

  entry.days.sort();
  return entry;
};

const parseYearParam = (value) => {
  const number = Number(value);
  return Number.isInteger(number) ? number : null;
};

const parseMonthParam = (value) => {
  const number = Number(value);
  return Number.isInteger(number) && number >= 1 && number <= 12
    ? number
    : null;
};

const buildMonthHref = (year, month) => {
  const params = new URLSearchParams();
  params.set("y", String(year));
  params.set("m", pad(month));
  return `/?${params.toString()}`;
};

const buildDayHref = (year, month, iso) => {
  const params = new URLSearchParams();
  params.set("y", String(year));
  params.set("m", pad(month));
  params.set("day", iso);
  return `/?${params.toString()}`;
};

const renderArticleCard = (page) => {
  if (!page) return null;
  const article = createElement("article", {
    className:
      "current-entry mx-auto flex h-full w-full max-w-none flex-col space-y-6 rounded-3xl border border-base-200 bg-base-100 p-6 shadow-lg shadow-base-200/40 transition-shadow duration-200 hover:shadow-xl lg:mx-0 lg:max-w-[360px]",
  });

  const header = createElement(
    "header",
    { className: "space-y-3 shrink-0" },
    [
      createElement(
        "h2",
        {
          className:
            "text-3xl font-semibold tracking-tight text-base-content md:text-4xl",
        },
        page.title || "",
      ),
      createElement("div", {
        className:
          "h-px w-full bg-gradient-to-r from-transparent via-base-300 to-transparent",
      }),
    ],
  );

  const body = createElement("div", {
    className:
      "entry-body prose prose-neutral max-w-none flex-1 text-base leading-relaxed text-base-content",
  });
  body.innerHTML = page.content || "";

  article.appendChild(header);
  article.appendChild(body);

  return article;
};

const createEmptyMessage = (text = "暂无文章") =>
  createElement(
    "div",
    {
      className:
        "flex h-full w-full items-center justify-center rounded-2xl border border-dashed border-base-300 bg-base-200/60 px-4 py-5 text-sm text-neutral-600",
    },
    text,
  );

const renderDayGroup = (iso, pages) => {
  const page = pages[0];
  if (!page) return null;
  return renderArticleCard(page);
};

const renderArticles = (state) => {
  const { root, currentMonth, activeDay, formatters } = state;

  const container = root.querySelector("[data-calendar-articles]");
  if (!container) return;

  container.innerHTML = "";

  let resolvedDay = activeDay || "";
  let pages = resolvedDay ? currentMonth.pagesByDay.get(resolvedDay) || [] : [];

  if (!resolvedDay && currentMonth.days.length) {
    resolvedDay = currentMonth.days[currentMonth.days.length - 1];
    pages = currentMonth.pagesByDay.get(resolvedDay) || [];
  }

  const page = pages[0];

  const wrapper = createElement("div", {
    className: "calendar-article space-y-4",
  });

  if (page) {
    const article = renderDayGroup(resolvedDay, pages);
    if (article) wrapper.appendChild(article);
  } else if (resolvedDay) {
    wrapper.appendChild(createEmptyMessage());
  } else {
    wrapper.appendChild(createEmptyMessage());
  }

  container.appendChild(wrapper);
};

const createNavControl = (label, target, disabled, monthFormatter) => {
  const baseClass = "btn btn-ghost btn-circle btn-sm";
  const targetMonthDate = new Date(target.year, target.month - 1, 1);
  const ariaLabel = `${label}, ${monthFormatter.format(targetMonthDate)}`;

  if (disabled) {
    return createElement(
      "span",
      {
        className: `${baseClass} btn-disabled pointer-events-none opacity-50`,
        attrs: {
          "aria-disabled": "true",
          "aria-label": ariaLabel,
        },
      },
      label === "‹" ? "‹" : "›",
    );
  }

  return createElement(
    "a",
    {
      className: baseClass,
      attrs: {
        href: buildMonthHref(target.year, target.month),
        "aria-label": ariaLabel,
      },
    },
    label === "‹" ? "‹" : "›",
  );
};

const renderCalendar = (state) => {
  const {
    root,
    monthMap,
    currentMonth,
    activeDay,
    minKey,
    maxKey,
    formatters,
    todayIso,
  } = state;

  const host = root.querySelector("[data-calendar-container]");
  if (!host) return;

  host.innerHTML = "";

  const monthDate = new Date(currentMonth.year, currentMonth.month - 1, 1);
  const calendar = createElement("div", {
    className: "calendar space-y-4",
  });

  const prevTarget = addMonths(currentMonth.year, currentMonth.month, -1);
  const prevKey = toMonthKey(prevTarget.year, prevTarget.month);
  const prevDisabled = !!minKey && compareMonthKey(prevKey, minKey) < 0;
  const nextTarget = addMonths(currentMonth.year, currentMonth.month, 1);
  const nextKey = toMonthKey(nextTarget.year, nextTarget.month);
  const nextDisabled = !!maxKey && compareMonthKey(nextKey, maxKey) > 0;

  const header = createElement(
    "div",
    {
      className: "calendar-header mb-4 flex items-center justify-between gap-2",
    },
    [
      createNavControl("‹", prevTarget, prevDisabled, formatters.month),
      createElement(
        "div",
        {
          className:
            "text-sm font-semibold uppercase tracking-wide text-neutral-600",
        },
        formatters.month.format(monthDate),
      ),
      createNavControl("›", nextTarget, nextDisabled, formatters.month),
    ],
  );

  const weekdayRow = createElement(
    "div",
    {
      className:
        "calendar-weekdays overflow-hidden rounded-2xl border border-base-300 bg-base-200 text-center text-xs font-semibold uppercase",
    },
    formatters.weekdayLabels.map((label, index) =>
      createElement(
        "span",
        {
          className: `weekday-label py-2 text-[11px] font-semibold tracking-wide ${index === 0 || index === 6 ? "is-weekend text-neutral-400" : "text-neutral-500"}`,
        },
        label,
      ),
    ),
  );

  const grid = createElement("div", {
    className:
      "calendar-days grid grid-cols-7 overflow-hidden rounded-2xl border border-base-300 bg-base-100",
  });

  const matrix = buildCalendarMatrix(currentMonth.year, currentMonth.month);

  matrix.forEach((week, weekIndex) => {
    const isLastWeek = weekIndex === matrix.length - 1;

    week.forEach((date, dayIndex) => {
      const targetYear = date.getFullYear();
      const targetMonth = date.getMonth() + 1;
      const targetKey = toMonthKey(targetYear, targetMonth);
      const iso = `${targetKey}-${pad(date.getDate())}`;
      const isCurrentMonth = targetKey === currentMonth.key;
      if (!isCurrentMonth) {
        const placeholderClasses = [
          "calendar-cell",
          "relative",
          "min-h-[72px]",
          "bg-base-200/40",
        ];
        if (dayIndex < 6) placeholderClasses.push("border-r", "border-base-300");
        if (!isLastWeek) placeholderClasses.push("border-b", "border-base-300");

        grid.appendChild(
          createElement("div", {
            className: placeholderClasses.join(" "),
          }),
        );
        return;
      }

      const withinRange =
        (!minKey || compareMonthKey(targetKey, minKey) >= 0) &&
        (!maxKey || compareMonthKey(targetKey, maxKey) <= 0);
      const monthData = monthMap.get(targetKey);
      const pages = monthData ? monthData.pagesByDay.get(iso) || [] : [];
      const hasPosts = pages.length > 0;
      const isActive = activeDay === iso;

      const ariaLabel = formatters.dayFull.format(date);
      const dayLabel = date.getDate().toString();

      const marker = hasPosts
        ? createElement("span", {
            className: `absolute bottom-2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full ${isActive ? "bg-primary-content" : "bg-primary"}`,
          })
        : null;

      const isWeekend = dayIndex === 0 || dayIndex === 6;
      const isToday = iso === todayIso;
      const anchorClasses = [
        "flex",
        "h-full",
        "w-full",
        "flex-col",
        "items-center",
        "justify-center",
        "gap-1",
        "px-1",
        "py-2",
        "rounded-2xl",
        "text-sm",
        "font-medium",
        "transition-colors",
        "duration-150",
        "focus-visible:outline",
        "focus-visible:outline-2",
        "focus-visible:outline-offset-2",
        "focus-visible:outline-primary",
      ];

      if (isActive) {
        anchorClasses.push(
          "bg-primary",
          "text-primary-content",
          "shadow-inner",
          "hover:bg-primary",
        );
      } else {
        anchorClasses.push(
          isWeekend ? "text-neutral-400" : "text-base-content",
          "bg-transparent",
          "hover:bg-base-200",
        );
        if (!hasPosts) anchorClasses.push("opacity-60");
      }

      if (isToday && !isActive) {
        anchorClasses.push("ring-1", "ring-base-300");
      }

      const cellContents = [
        createElement("span", { className: "leading-none" }, dayLabel),
        marker,
      ];

      const cell =
        !withinRange
          ? createElement(
              "span",
              {
                className: `${anchorClasses.join(" ")} pointer-events-none opacity-50`,
                attrs: {
                  "aria-disabled": "true",
                  "aria-label": ariaLabel,
                },
              },
              cellContents,
            )
          : createElement(
              "a",
              {
                className: anchorClasses.join(" "),
                attrs: {
                  href: buildDayHref(currentMonth.year, currentMonth.month, iso),
                  "aria-label": ariaLabel,
                  "aria-current": isActive ? "date" : null,
                },
              },
              cellContents,
            );

      const cellClasses = [
        "calendar-cell",
        "relative",
        "min-h-[72px]",
        "bg-base-100",
      ];
      if (dayIndex < 6) cellClasses.push("border-r", "border-base-300");
      if (!isLastWeek) cellClasses.push("border-b", "border-base-300");

      grid.appendChild(
        createElement(
          "div",
          {
            className: cellClasses.join(" "),
          },
          cell,
        ),
      );
    });
  });

  calendar.appendChild(header);
  calendar.appendChild(weekdayRow);
  calendar.appendChild(grid);
  host.appendChild(calendar);
};

const setupCalendar = (root) => {
  const locale = document.documentElement.lang || "en-US";

  let rawMonths;
  try {
    rawMonths = JSON.parse(root.dataset.calendarData || "[]");
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to parse calendar data", error);
    return;
  }

  const monthMap = new Map();
  rawMonths.forEach((raw) => {
    const entry = parseMonthData(raw);
    if (entry) {
      monthMap.set(entry.key, entry);
    }
  });

  const parsedDefaultYear = parseYearParam(root.dataset.defaultYear);
  const parsedDefaultMonth = parseMonthParam(root.dataset.defaultMonth);
  const datasetDefaultKey = root.dataset.defaultKey || "";
  const datasetDefaultDay = root.dataset.defaultDay || "";
  const defaultYear =
    parsedDefaultYear !== null ? parsedDefaultYear : new Date().getFullYear();
  const defaultMonth =
    parsedDefaultMonth !== null
      ? parsedDefaultMonth
      : new Date().getMonth() + 1;
  const defaultKey = toMonthKey(defaultYear, defaultMonth);

  if (!monthMap.has(defaultKey)) {
    monthMap.set(defaultKey, {
      key: defaultKey,
      year: defaultYear,
      month: defaultMonth,
      days: [],
      pagesByDay: new Map(),
    });
  }

  const datasetMinYear = parseYearParam(root.dataset.minYear);
  const datasetMinMonth = parseMonthParam(root.dataset.minMonth);
  const datasetMaxYear = parseYearParam(root.dataset.maxYear);
  const datasetMaxMonth = parseMonthParam(root.dataset.maxMonth);

  let minKey =
    datasetMinYear !== null && datasetMinMonth !== null
      ? toMonthKey(datasetMinYear, datasetMinMonth)
      : null;
  let maxKey =
    datasetMaxYear !== null && datasetMaxMonth !== null
      ? toMonthKey(datasetMaxYear, datasetMaxMonth)
      : null;

  monthMap.forEach((entry, key) => {
    if (!minKey || compareMonthKey(key, minKey) < 0) minKey = key;
    if (!maxKey || compareMonthKey(key, maxKey) > 0) maxKey = key;
  });

  const params = new URLSearchParams(window.location.search);
  const requestedYear = parseYearParam(params.get("y"));
  const requestedMonth = parseMonthParam(params.get("m"));

  let currentKey = defaultKey;
  if (requestedYear !== null && requestedMonth !== null) {
    currentKey = clampMonthKey(
      toMonthKey(requestedYear, requestedMonth),
      minKey,
      maxKey,
    );
  }

  const { year: currentYear, month: currentMonthNumber } =
    parseMonthKey(currentKey);

  if (!monthMap.has(currentKey)) {
    monthMap.set(currentKey, {
      key: currentKey,
      year: currentYear,
      month: currentMonthNumber,
      days: [],
      pagesByDay: new Map(),
    });
  }

  const currentMonth = monthMap.get(currentKey);

  const dayParam = params.get("day");
  let activeDay = null;
  if (
    dayParam &&
    /^\d{4}-\d{2}-\d{2}$/.test(dayParam) &&
    dayParam.startsWith(`${currentKey}-`)
  ) {
    activeDay = dayParam;
  }

  if (!activeDay) {
    if (
      currentKey === datasetDefaultKey &&
      datasetDefaultDay &&
      currentMonth.pagesByDay.has(datasetDefaultDay)
    ) {
      activeDay = datasetDefaultDay;
    } else if (currentMonth.days.length) {
      activeDay = currentMonth.days[currentMonth.days.length - 1];
    }
  }

  const weekStart = new Date(2023, 0, 1); // Sunday
  const weekdayFormatter = new Intl.DateTimeFormat(locale, {
    weekday: "short",
  });
  const weekdayLabels = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return weekdayFormatter.format(date);
  });

  const formatters = {
    month: new Intl.DateTimeFormat(locale, { year: "numeric", month: "long" }),
    dayFull: new Intl.DateTimeFormat(locale, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    dayHeading: new Intl.DateTimeFormat(locale, {
      weekday: "long",
      month: "long",
      day: "numeric",
    }),
    weekdayLabels,
  };

  const today = new Date();
  const todayMonthKey = toMonthKey(today.getFullYear(), today.getMonth() + 1);
  const todayIso = `${todayMonthKey}-${pad(today.getDate())}`;

  const state = {
    root,
    monthMap,
    currentMonth,
    activeDay,
    minKey,
    maxKey,
    formatters,
    todayIso,
  };

  renderCalendar(state);
  renderArticles(state);
};

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-calendar]").forEach(setupCalendar);
});
