import React from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import {
  Users, FolderOpen, CheckSquare, DollarSign,
  Activity, MessageSquare, Map, Layers,
} from 'lucide-react';

export interface ActivityItem {
  id: string;
  entityType: 'user' | 'project' | 'task' | 'comment' | 'feedback' | 'invoice' | 'roadmap';
  entityId: string;
  description: string;
  timestamp: string;
}

function activityIcon(type: ActivityItem['entityType']) {
  const cls = 'h-4 w-4';
  switch (type) {
    case 'user': return <Users className={cls} />;
    case 'project': return <FolderOpen className={cls} />;
    case 'task': return <CheckSquare className={cls} />;
    case 'comment': return <MessageSquare className={cls} />;
    case 'feedback': return <Activity className={cls} />;
    case 'invoice': return <DollarSign className={cls} />;
    case 'roadmap': return <Map className={cls} />;
    default: return <Layers className={cls} />;
  }
}

function activityHref(item: ActivityItem): string {
  switch (item.entityType) {
    case 'user': return '/admin/users';
    case 'project': return '/admin/projects';
    case 'task': return '/admin/tasks';
    case 'feedback': return '/admin/feedback';
    case 'invoice': return '/admin/payments';
    case 'roadmap': return '/admin/roadmap';
    default: return '/admin';
  }
}

interface ActivityFeedProps {
  activities: ActivityItem[];
  maxItems?: number;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities, maxItems = 20 }) => (
  <div className="bg-glass border border-border-color rounded-xl p-5">
    <h2 className="text-sm font-semibold text-text-primary mb-4">Recent Activity</h2>
    <div className="space-y-1">
      {activities.slice(0, maxItems).map((item) => (
        <Link
          key={item.id}
          to={activityHref(item)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-glass-light transition-colors group"
        >
          <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            {activityIcon(item.entityType)}
          </div>
          <p className="text-sm text-text-primary flex-1 group-hover:text-primary transition-colors">
            {item.description}
          </p>
          <span className="text-xs text-text-secondary flex-shrink-0">
            {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
          </span>
        </Link>
      ))}
    </div>
  </div>
);
