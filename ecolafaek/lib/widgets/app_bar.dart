import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';
import '../screens/profile_screen.dart';

class CustomAppBar extends StatelessWidget implements PreferredSizeWidget {
  final String title;
  final List<Widget>? actions;
  final Widget? leading;
  final bool showBackButton;
  final bool showProfileAction;
  final VoidCallback? onBackPressed;
  final Color? backgroundColor;
  final Color? foregroundColor;
  final double elevation;
  final PreferredSizeWidget? bottom;

  const CustomAppBar({
    Key? key,
    required this.title,
    this.actions,
    this.leading,
    this.showBackButton = true,
    this.showProfileAction = true,
    this.onBackPressed,
    this.backgroundColor,
    this.foregroundColor,
    this.elevation = 0,
    this.bottom,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isAuthenticated = Provider.of<AuthProvider>(context).isAuth;
    
    // Create action buttons list
    final List<Widget> actionList = [];
    
    // Add profile button if authenticated and showProfileAction is true
    if (isAuthenticated && showProfileAction) {
      actionList.add(
        IconButton(
          icon: const Icon(Icons.person),
          onPressed: () {
            Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const ProfileScreen()),
            );
          },
          tooltip: 'Profile',
        ),
      );
    }
    
    // Add additional action buttons
    if (actions != null) {
      actionList.addAll(actions!);
    }
    
    return AppBar(
      title: Text(title),
      leading: leading ?? (showBackButton && Navigator.of(context).canPop()
          ? IconButton(
              icon: const Icon(Icons.arrow_back),
              onPressed: onBackPressed ?? () => Navigator.of(context).pop(),
            )
          : null),
      actions: actionList.isNotEmpty ? actionList : null,
      backgroundColor: backgroundColor ?? theme.primaryColor,
      foregroundColor: foregroundColor ?? Colors.white,
      elevation: elevation,
      centerTitle: true,
      bottom: bottom,
    );
  }

  @override
  Size get preferredSize => Size.fromHeight(
        kToolbarHeight + (bottom?.preferredSize.height ?? 0),
      );
}

// App bar with search functionality
class SearchAppBar extends StatefulWidget implements PreferredSizeWidget {
  final String title;
  final String hintText;
  final Function(String) onSearch;
  final VoidCallback? onClear;
  final VoidCallback? onClose;
  final bool showProfileAction;
  final List<Widget>? actions;

  const SearchAppBar({
    Key? key,
    required this.title,
    this.hintText = 'Search...',
    required this.onSearch,
    this.onClear,
    this.onClose,
    this.showProfileAction = true,
    this.actions,
  }) : super(key: key);

  @override
  State<SearchAppBar> createState() => _SearchAppBarState();

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);
}

class _SearchAppBarState extends State<SearchAppBar> {
  bool _showSearch = false;
  final TextEditingController _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _toggleSearch() {
    setState(() {
      _showSearch = !_showSearch;
              if (!_showSearch) {
        _searchController.clear();
        if (widget.onClear != null) {
          widget.onClear!();
        }
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    if (_showSearch) {
      return AppBar(
        title: TextField(
          controller: _searchController,
          decoration: InputDecoration(
            hintText: widget.hintText,
            border: InputBorder.none,
            hintStyle: TextStyle(color: Colors.white.withOpacity(0.7)),
          ),
          style: const TextStyle(color: Colors.white),
          cursorColor: Colors.white,
          autofocus: true,
          onChanged: widget.onSearch,
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            _toggleSearch();
            if (widget.onClose != null) {
              widget.onClose!();
            }
          },
        ),
        actions: [
          if (_searchController.text.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.clear),
              onPressed: () {
                _searchController.clear();
                if (widget.onClear != null) {
                  widget.onClear!();
                } else {
                  widget.onSearch('');
                }
              },
            ),
        ],
      );
    } else {
      return CustomAppBar(
        title: widget.title,
        showProfileAction: widget.showProfileAction,
        actions: [
          IconButton(
            icon: const Icon(Icons.search),
            onPressed: _toggleSearch,
            tooltip: 'Search',
          ),
          ...?widget.actions,
        ],
      );
    }
  }
}

// App bar with tabs
class TabAppBar extends StatelessWidget implements PreferredSizeWidget {
  final String title;
  final List<Tab> tabs;
  final List<Widget>? actions;
  final bool showProfileAction;
  final Color? backgroundColor;
  final Color? foregroundColor;

  const TabAppBar({
    Key? key,
    required this.title,
    required this.tabs,
    this.actions,
    this.showProfileAction = true,
    this.backgroundColor,
    this.foregroundColor,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return CustomAppBar(
      title: title,
      actions: actions,
      showProfileAction: showProfileAction,
      backgroundColor: backgroundColor,
      foregroundColor: foregroundColor,
      bottom: TabBar(
        tabs: tabs,
        indicatorColor: foregroundColor ?? Colors.white,
        labelColor: foregroundColor ?? Colors.white,
      ),
    );
  }

  @override
  Size get preferredSize => Size.fromHeight(kToolbarHeight + 48); // 48 is the height of the tab bar
}