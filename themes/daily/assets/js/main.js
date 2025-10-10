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
  if (typeof iso === "string") {
    const segments = iso.split("-");
    if (segments.length === 3) {
      const dayNumber = Number(segments[2]);
      if (Number.isInteger(dayNumber)) {
        params.set("day", String(dayNumber));
      }
    }
  }
  return `/?${params.toString()}`;
};

const renderArticleCard = (page) => {
  if (!page) return null;
  const article = createElement("article", {
    className:
      "current-entry mx-auto flex h-full w-full max-w-none flex-col gap-6 rounded-2xl border border-neutral-200 bg-white p-7 shadow-sm transition-shadow duration-200 hover:shadow lg:mx-0 lg:max-w-[520px] xl:max-w-[640px]",
  });

  const header = createElement(
    "header",
    { className: "space-y-2.5 shrink-0" },
    [
      createElement(
        "h2",
        {
          className:
            "text-3xl font-semibold tracking-tight text-neutral-900 md:text-[34px]",
        },
        page.title || "",
      ),
      createElement("div", {
        className: "h-px w-full bg-neutral-200",
      }),
    ],
  );

  const body = createElement("div", {
    className:
      "prose entry-body max-w-none flex-1 text-[15px] leading-relaxed text-neutral-700",
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
        "flex h-full w-full items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 px-6 py-10 text-sm text-neutral-400",
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
    className: "calendar-article flex h-full flex-col gap-5",
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
  const baseClass =
    "calendar-nav-button inline-flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 text-lg font-medium text-neutral-500 transition-colors duration-200 hover:border-neutral-300 hover:text-neutral-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-500";
  const targetMonthDate = new Date(target.year, target.month - 1, 1);
  const ariaLabel = `${label}, ${monthFormatter.format(targetMonthDate)}`;

  if (disabled) {
    return createElement(
      "span",
      {
        className: `${baseClass} pointer-events-none opacity-40`,
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
    className: "calendar flex h-full flex-col gap-5",
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
      className: "calendar-header flex items-center justify-between",
    },
    [
      createElement(
        "div",
        {
          className:
            "calendar-month text-3xl font-semibold tracking-tight text-neutral-900",
        },
        formatters.month.format(monthDate),
      ),
      createElement(
        "div",
        { className: "calendar-navigation flex items-center gap-2" },
        [
          createNavControl("‹", prevTarget, prevDisabled, formatters.month),
          createNavControl("›", nextTarget, nextDisabled, formatters.month),
        ],
      ),
    ],
  );

  const weekdayRow = createElement(
    "div",
    {
      className:
        "calendar-weekdays grid grid-cols-7 border-b border-neutral-200 pb-2 text-center text-xs font-semibold uppercase tracking-[0.2em]",
    },
    formatters.weekdayLabels.map((label, index) =>
      createElement(
        "span",
        {
          className: `weekday-label block text-[11px] tracking-[0.18em] ${index === 6 ? "text-neutral-400" : "text-neutral-500"}`,
        },
        label,
      ),
    ),
  );

  const grid = createElement("div", {
    className:
      "calendar-days grid grid-cols-7 overflow-hidden rounded-2xl border border-neutral-200 bg-white",
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
          "min-h-[56px]",
          "bg-neutral-50",
        ];
        if (dayIndex < 6)
          placeholderClasses.push("border-r", "border-neutral-200");
        if (!isLastWeek)
          placeholderClasses.push("border-b", "border-neutral-200");

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

      const isSunday = dayIndex === 0;
      const isSaturday = dayIndex === 6;
      const isToday = iso === todayIso;
      const anchorClasses = [
        "group",
        "relative",
        "flex",
        "h-full",
        "w-full",
        "flex-col",
        "items-center",
        "justify-start",
        "rounded-lg",
        "px-2",
        "py-2",
        "focus-visible:outline",
        "focus-visible:outline-2",
        "focus-visible:outline-offset-2",
        "focus-visible:outline-neutral-500",
      ];

      const dayNumberClasses = [
        "day-number",
        "flex",
        "h-8",
        "w-8",
        "items-center",
        "justify-center",
        "rounded-full",
        "text-sm",
        "font-semibold",
        "transition-colors",
        "duration-150",
      ];

      if (isActive) {
        dayNumberClasses.push(
          "text-neutral-900",
          "border",
          "border-red-500",
          "text-white",
          "bg-red-500",
        );
      } else if (isToday) {
        dayNumberClasses.push("border", "border-red-500", "text-red-500");
      } else if (!withinRange) {
        dayNumberClasses.push("text-neutral-300");
      } else if (!hasPosts) {
        dayNumberClasses.push("text-neutral-400");
      } else if (isSaturday) {
        dayNumberClasses.push("text-neutral-500");
      } else {
        dayNumberClasses.push("text-neutral-700");
      }

      const dayNumber = createElement(
        "span",
        { className: dayNumberClasses.join(" ") },
        dayLabel,
      );

      const marker =
        hasPosts && withinRange
          ? createElement("span", {
              className: "mt-1 h-1.5 w-1.5 rounded-full bg-red-500",
            })
          : null;

      const cellContents = [dayNumber, marker].filter(Boolean);

      const cell = !withinRange
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
        "min-h-[56px]",
        "bg-white",
        "px-1",
      ];
      if (dayIndex < 6) cellClasses.push("border-r", "border-neutral-200");
      if (!isLastWeek) cellClasses.push("border-b", "border-neutral-200");

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
  if (dayParam && /^\d{1,2}$/.test(dayParam)) {
    const dayNumber = Number(dayParam);
    const daysInMonth = new Date(
      currentMonth.year,
      currentMonth.month,
      0,
    ).getDate();
    if (dayNumber >= 1 && dayNumber <= daysInMonth) {
      activeDay = `${currentKey}-${pad(dayNumber)}`;
    }
  } else if (
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
