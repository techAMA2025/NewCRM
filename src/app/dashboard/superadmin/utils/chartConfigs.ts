export const getChartOptions = (theme: 'dark' | 'light') => {
  const textColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(17, 24, 39, 0.8)';
  const gridColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
  const tickColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(55, 65, 81, 0.7)';

  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: textColor,
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: tickColor,
        },
        grid: {
          color: gridColor,
        },
      },
      y: {
        ticks: {
          color: tickColor,
        },
        grid: {
          color: gridColor,
        },
      },
    },
  };
};

// Keep original for backward compatibility if needed, but prefer using the function
export const chartOptions = getChartOptions('dark');

export const getStackedBarOptions = (theme: 'dark' | 'light') => {
  const textColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(17, 24, 39, 0.8)';
  const gridColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
  const tickColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(55, 65, 81, 0.7)';

  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: textColor,
        },
      },
      title: {
        display: true,
        text: 'Lead Distribution by Source and Status',
        color: textColor,
      },
    },
    scales: {
      x: {
        stacked: true,
        ticks: {
          color: tickColor,
        },
        grid: {
          color: gridColor,
        },
      },
      y: {
        stacked: true,
        ticks: {
          color: tickColor,
        },
        grid: {
          color: gridColor,
        },
      },
    },
  };
};

export const stackedBarOptions = getStackedBarOptions('dark');

export const getPieOptions = (theme: 'dark' | 'light') => {
  const textColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(17, 24, 39, 0.8)';

  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          color: textColor,
        },
      },
    },
  };
};

export const pieOptions = getPieOptions('dark');

export const getSourceTotalsPieOptions = (theme: 'dark' | 'light') => {
  const textColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(17, 24, 39, 0.8)';
  const titleColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(17, 24, 39, 0.9)';

  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: textColor,
          padding: 15,
          font: {
            size: 12
          }
        },
      },
      title: {
        display: true,
        text: 'Total Leads by Source',
        color: titleColor,
        font: {
          size: 16
        },
        padding: {
          top: 10,
          bottom: 20
        }
      },
    },
  };
};

export const sourceTotalsPieOptions = getSourceTotalsPieOptions('dark');

export const getHorizontalBarOptions = (theme: 'dark' | 'light') => {
  const textColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(17, 24, 39, 0.8)';
  const titleColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(17, 24, 39, 0.9)';
  const gridColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
  const tickColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(55, 65, 81, 0.7)';

  return {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          color: textColor,
        },
      },
      title: {
        display: true,
        text: 'Conversion Performance by Source',
        color: titleColor,
        font: {
          size: 16
        },
        padding: {
          top: 10,
          bottom: 15
        }
      },
      tooltip: {
        callbacks: {
          footer: (tooltipItems: any) => {
            const sourceIndex = tooltipItems[0].dataIndex;
            // This will need to be passed as a prop or context
            return `Conversion Rate: 0%`;
          }
        }
      }
    },
    scales: {
      x: {
        stacked: true,
        grid: {
          color: gridColor,
        },
        ticks: {
          color: tickColor,
        }
      },
      y: {
        stacked: true,
        grid: {
          display: false,
        },
        ticks: {
          color: tickColor,
        }
      }
    },
  };
};

export const horizontalBarOptions = getHorizontalBarOptions('dark');

export const statusColors = [
  'rgba(52, 191, 163, 0.8)',
  'rgba(235, 87, 87, 0.8)',
  'rgba(249, 178, 51, 0.8)',
  'rgba(98, 114, 164, 0.8)',
  'rgba(30, 215, 96, 0.8)',
  'rgba(138, 43, 226, 0.8)',
  'rgba(255, 159, 64, 0.8)',
  'rgba(201, 203, 207, 0.8)',
  'rgba(128, 128, 128, 0.8)',
];

export const sourceColors = {
  settleloans: 'rgba(19, 78, 74, 0.8)',  // Teal-900 (#134e4a)
  credsettlee: 'rgba(107, 33, 168, 0.8)', // Purple-800 (#6b21a8)
  ama: 'rgba(146, 64, 14, 0.8)',          // Amber-800 (#92400e)
  billcut: 'rgba(255, 212, 111, 0.8)',      // Golden Yellow (#FFD46F)
};