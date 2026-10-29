const PATHS: Record<string, string[]> = {
  vocab: ["M3 7a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z", "M8 3h9a2 2 0 0 1 2 2v12", "M6.5 16l3-7 3 7M7.7 13.5h3.6"],
  grammar: ["M3 14.5A1.5 1.5 0 0 1 4.5 13h5a1.5 1.5 0 0 1 1.5 1.5v4A1.5 1.5 0 0 1 9.5 20h-5A1.5 1.5 0 0 1 3 18.5z", "M13 14.5a1.5 1.5 0 0 1 1.5-1.5h5a1.5 1.5 0 0 1 1.5 1.5v4a1.5 1.5 0 0 1-1.5 1.5h-5a1.5 1.5 0 0 1-1.5-1.5z", "M8 5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5v4a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 8 9.5z"],
  exercises: ["M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z", "M8 9l1.5 1.5L12 8M8 15l1.5 1.5L12 14M14.5 9.5H17M14.5 15.5H17"],
  retrieval: ["M20 12a8 8 0 0 1-14.3 4.9M4 12a8 8 0 0 1 14.3-4.9", "M18.5 3v4.5H14M5.5 21v-4.5H10"],
  reading: ["M12 6.5C10 5 7 4.5 3 5v13c4-.5 7 0 9 1.5 2-1.5 5-2 9-1.5V5c-4-.5-7 0-9 1.5z", "M12 6.5v13"],
  listening: ["M4 15v-3a8 8 0 0 1 16 0v3", "M3 15.5A1.5 1.5 0 0 1 4.5 14h1A1.5 1.5 0 0 1 7 15.5v3A1.5 1.5 0 0 1 5.5 20h-1A1.5 1.5 0 0 1 3 18.5z", "M17 15.5a1.5 1.5 0 0 1 1.5-1.5h1a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-1a1.5 1.5 0 0 1-1.5-1.5z"],
  speaking: ["M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H10l-5 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z", "M8 10h8M8 13h5"],
  pronunciation: ["M9 6a3 3 0 0 1 6 0v5a3 3 0 0 1-6 0z", "M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6"],
  writing: ["M15.5 4.5l4 4L9 19l-5 1 1-5z", "M13.5 6.5l4 4"],
  quiz: ["M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17z", "M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9z", "M12 11.2a.8.8 0 1 0 0 1.6.8.8 0 0 0 0-1.6z"],
  other: ["M5 21V4M5 4h11l-2 4 2 4H5"],
  placement: ["M4 17a8 8 0 1 1 16 0", "M12 17l4-5", "M7 17h.01M17 17h.01"],
  path: ["M6 16a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM18 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4z", "M8 18h6a3 3 0 0 0 0-6h-4a3 3 0 0 1 0-6h6"],
  chevron: ["M9 6l6 6-6 6"],
};

export function RoleIcon({ role, className = "role-icon" }: { role: string; className?: string }) {
  const paths = PATHS[role] ?? PATHS.other ?? [];
  return (
    <svg className={className} viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {paths.map((d) => <path key={d} d={d} />)}
    </svg>
  );
}
