import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:animate_do/animate_do.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:share_plus/share_plus.dart';
import 'package:intl/intl.dart';

import '../providers/auth_provider.dart';
import '../providers/report_provider.dart';
import '../widgets/custom_button.dart';
import '../widgets/loading_indicator.dart';
import 'login_screen.dart';
import 'change_password_screen.dart';

class ProfileScreen extends StatefulWidget {
  static const routeName = '/profile';
  final bool isInTabView;

  const ProfileScreen({
    Key? key, 
    this.isInTabView = false,
  }) : super(key: key);

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  final _phoneController = TextEditingController();
  bool _isEditing = false;
  bool _isSaving = false;
  String? _errorMessage;
  

  @override
  void initState() {
    super.initState();
    _initializeForm();
  }
  
  @override
  void dispose() {
    _phoneController.dispose();
    super.dispose();
  }
  
  // Initialize form with user data
  void _initializeForm() {
    final user = Provider.of<AuthProvider>(context, listen: false).currentUser;
    if (user != null) {
      _phoneController.text = user.phoneNumber ?? '';
    }
  }
  
  
  // Toggle edit mode
  void _toggleEditMode() {
    setState(() {
      _isEditing = !_isEditing;
      if (!_isEditing) {
        // Reset form when canceling
        _initializeForm();
      }
    });
  }
  
  // Save profile changes (only phone number can be edited)
  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }
    
    setState(() {
      _isSaving = true;
      _errorMessage = null;
    });
    
    try {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      final user = authProvider.currentUser;
      
      // Update profile - only phone number is editable
      final success = await authProvider.updateProfile(
        email: user?.email ?? '', // Keep existing email
        phoneNumber: _phoneController.text.trim(),
        profileImageUrl: user?.profileImageUrl, // Keep existing profile image
      );
      
      if (success) {
        setState(() {
          _isEditing = false;
          _isSaving = false;
        });
        
        // Show success message
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Phone number updated successfully'),
            backgroundColor: Colors.green,
          ),
        );
      } else {
        setState(() {
          _errorMessage = authProvider.errorMessage;
          _isSaving = false;
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Failed to update profile: ${e.toString()}';
        _isSaving = false;
      });
    }
  }
  
  // Sign out
  Future<void> _signOut() async {
    // Show confirmation dialog
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Sign Out'),
        content: const Text('Are you sure you want to sign out?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('CANCEL'),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('SIGN OUT'),
          ),
        ],
      ),
    );
    
    if (confirm != true) return;
    
    // Sign out
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    await authProvider.signOut();
    
    // Always navigate to login screen, regardless of isInTabView
    Navigator.of(context).pushNamedAndRemoveUntil(
      LoginScreen.routeName, 
      (route) => false, // This removes all previous routes
    );
  }
  
  // Share app
  void _shareApp() {
    const message = '''
Join me on EcoLafaek - the app helping to keep Timor-Leste clean and beautiful!

Report waste issues, track cleanup progress, and be part of the solution.

Download EcoLafaek today! [App Link Coming Soon]
''';
    
    Share.share(message, subject: 'Join me on EcoLafaek');
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final primaryColor = theme.primaryColor;
    final user = Provider.of<AuthProvider>(context).currentUser;
    
    if (user == null) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Profile'),
          backgroundColor: primaryColor,
          centerTitle: true,
          automaticallyImplyLeading: !widget.isInTabView,
        ),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text(
                'You are not logged in',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: () {
                  Navigator.of(context).pushReplacementNamed(LoginScreen.routeName);
                },
                child: const Text('Go to Login'),
              ),
            ],
          ),
        ),
      );
    }
    
    return Scaffold(
      appBar: widget.isInTabView
          ? null
          : AppBar(
              title: const Text('Profile'),
              backgroundColor: primaryColor,
              centerTitle: true,
            ),
      body: Stack(
        children: [
          // Main content
          CustomScrollView(
            slivers: [
              // Top section with profile info
              SliverToBoxAdapter(
                child: Stack(
                  children: [
                    // Top background
                    Container(
                      height: 140,
                      color: primaryColor,
                    ),
                    
                    // Profile info card
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 30, 16, 0),
                      child: FadeInDown(
                        duration: const Duration(milliseconds: 600),
                        child: Card(
                          elevation: 4,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.all(16.0),
                            child: Column(
                              children: [
                                // Profile picture (not editable)
                                CircleAvatar(
                                  radius: 50,
                                  backgroundColor: Colors.grey[200],
                                  child: user.profileImageUrl != null
                                    ? ClipRRect(
                                        borderRadius: BorderRadius.circular(50),
                                        child: CachedNetworkImage(
                                          imageUrl: user.profileImageUrl!,
                                          width: 100,
                                          height: 100,
                                          fit: BoxFit.cover,
                                          placeholder: (context, url) => const CircularProgressIndicator(),
                                          errorWidget: (ctx, url, error) => Text(
                                            user.username.substring(0, 1).toUpperCase(),
                                            style: TextStyle(
                                              fontSize: 36,
                                              color: primaryColor,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ),
                                      )
                                    : Text(
                                        user.username.substring(0, 1).toUpperCase(),
                                        style: TextStyle(
                                          fontSize: 36,
                                          color: primaryColor,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                ),
                                
                                const SizedBox(height: 16),
                                
                                // Username
                                Text(
                                  user.username,
                                  style: const TextStyle(
                                    fontSize: 24,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                
                                const SizedBox(height: 4),
                                
                                // Verification status
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(
                                      user.isVerified
                                          ? Icons.verified
                                          : Icons.verified_outlined,
                                      color: user.isVerified ? Colors.blue : Colors.grey,
                                      size: 16,
                                    ),
                                    const SizedBox(width: 4),
                                    Text(
                                      user.isVerified
                                          ? 'Verified Account'
                                          : 'Unverified Account',
                                      style: TextStyle(
                                        color: user.isVerified ? Colors.blue : Colors.grey,
                                        fontSize: 14,
                                      ),
                                    ),
                                  ],
                                ),
                                
                                const SizedBox(height: 16),
                                
                                // Member since
                                Text(
                                  'Member since ${DateFormat('MMMM yyyy').format(user.registrationDate)}',
                                  style: TextStyle(
                                    fontSize: 14,
                                    color: Colors.grey[600],
                                  ),
                                ),
                                
                                // Edit profile button
                                const SizedBox(height: 16),
                                
                                _isEditing
                                    ? Row(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          // Cancel button
                                          OutlinedButton(
                                            onPressed: _isSaving ? null : _toggleEditMode,
                                            style: OutlinedButton.styleFrom(
                                              foregroundColor: Colors.grey[700],
                                              side: BorderSide(color: Colors.grey[400]!),
                                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                                            ),
                                            child: const Text('Cancel'),
                                          ),
                                          
                                          const SizedBox(width: 16),
                                          
                                          // Save button
                                          ElevatedButton(
                                            onPressed: _isSaving ? null : _saveProfile,
                                            style: ElevatedButton.styleFrom(
                                              backgroundColor: primaryColor,
                                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                                            ),
                                            child: _isSaving
                                                ? SizedBox(
                                                    width: 20,
                                                    height: 20,
                                                    child: CircularProgressIndicator(
                                                      strokeWidth: 2,
                                                      color: Colors.white,
                                                    ),
                                                  )
                                                : const Text('Save'),
                                          ),
                                        ],
                                      )
                                    : ElevatedButton.icon(
                                        onPressed: _toggleEditMode,
                                        icon: const Icon(Icons.edit),
                                        label: const Text('Edit Phone Number'),
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: primaryColor,
                                          foregroundColor: Colors.white,
                                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                                        ),
                                      ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              
              // Form fields when editing
              if (_isEditing)
                SliverToBoxAdapter(
                  child: FadeInUp(
                    duration: const Duration(milliseconds: 500),
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Form(
                        key: _formKey,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Contact Information',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: Colors.grey[800],
                              ),
                            ),
                            
                            const SizedBox(height: 16),
                            
                            // Phone field (only editable field)
                            TextFormField(
                              controller: _phoneController,
                              decoration: InputDecoration(
                                labelText: 'Phone Number',
                                hintText: 'Enter your phone number',
                                prefixIcon: const Icon(Icons.phone),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                              keyboardType: TextInputType.phone,
                            ),
                            
                            // Error message
                            if (_errorMessage != null)
                              Padding(
                                padding: const EdgeInsets.only(top: 16),
                                child: Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: Colors.red[50],
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(color: Colors.red[200]!),
                                  ),
                                  child: Row(
                                    children: [
                                      Icon(Icons.error_outline, color: Colors.red[700], size: 20),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: Text(
                                          _errorMessage!,
                                          style: TextStyle(color: Colors.red[700]),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              
              // Profile information
              if (!_isEditing)
                SliverToBoxAdapter(
                  child: FadeInUp(
                    duration: const Duration(milliseconds: 500),
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Card(
                        elevation: 2,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(16.0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Profile Information',
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.grey[800],
                                ),
                              ),
                              
                              const SizedBox(height: 16),
                              
                              // Email (not editable)
                              _buildInfoRow(
                                icon: Icons.email,
                                title: 'Email',
                                value: user.email ?? 'Not provided',
                              ),
                              
                              // Phone
                              _buildInfoRow(
                                icon: Icons.phone,
                                title: 'Phone',
                                value: user.phoneNumber ?? 'Not provided',
                                isEditable: true,
                                onTapEdit: _toggleEditMode,
                              ),
                              
                              // Account status
                              _buildInfoRow(
                                icon: Icons.person,
                                title: 'Account Status',
                                value: user.accountStatus.capitalize(),
                              ),
                              
                              // Last login
                              _buildInfoRow(
                                icon: Icons.access_time,
                                title: 'Last Login',
                                value: user.lastLogin != null
                                    ? DateFormat('MMM d, yyyy, h:mm a').format(user.lastLogin!)
                                    : 'Not available',
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              
              // Account actions
              SliverToBoxAdapter(
                child: FadeInUp(
                  duration: const Duration(milliseconds: 600),
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Card(
                      elevation: 2,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(8.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                              child: Text(
                                'Account Settings',
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.grey[800],
                                ),
                              ),
                            ),
                            
                            const Divider(),
                            
                            // Change password
                            ListTile(
                              leading: Icon(Icons.lock, color: primaryColor),
                              title: const Text('Change Password'),
                              trailing: const Icon(Icons.chevron_right),
                              onTap: () {
                                Navigator.of(context).pushNamed(ChangePasswordScreen.routeName);
                              },
                            ),
                            
                            const Divider(),
                            
                            // Share app
                            ListTile(
                              leading: Icon(Icons.share, color: Colors.green),
                              title: const Text('Share App'),
                              trailing: const Icon(Icons.chevron_right),
                              onTap: _shareApp,
                            ),
                            
                            const Divider(),
                            
                            // Contact support
                            ListTile(
                              leading: Icon(Icons.support_agent, color: Colors.blue),
                              title: const Text('Contact Support'),
                              trailing: const Icon(Icons.chevron_right),
                              onTap: () {
                                // Launch email app with support email
                                launchUrl(Uri.parse('mailto:support@ecolafaek.tl?subject=Support%20Request'));
                              },
                            ),
                            
                            const Divider(),
                            
                            // About app
                            ListTile(
                              leading: Icon(Icons.info_outline, color: Colors.purple),
                              title: const Text('About EcoLafaek'),
                              trailing: const Icon(Icons.chevron_right),
                              onTap: () {
                                _showAboutDialog();
                              },
                            ),
                            
                            const Divider(),
                            
                            // Sign out
                            ListTile(
                              leading: const Icon(Icons.logout, color: Colors.red),
                              title: const Text('Sign Out'),
                              trailing: const Icon(Icons.chevron_right),
                              onTap: _signOut,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              
              // App version
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 24),
                  child: Center(
                    child: Text(
                      'Version 1.0.0',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey[600],
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
          
          // Loading overlay
          if (_isSaving)
            Container(
              color: Colors.black.withOpacity(0.5),
              child: const Center(
                child: LoadingIndicator(
                  message: 'Saving changes...',
                  color: Colors.white,
                ),
              ),
            ),
        ],
      ),
    );
  }
  
  
  // Helper for info rows
  Widget _buildInfoRow({
    required IconData icon,
    required String title,
    required String value,
    bool isEditable = false,
    VoidCallback? onTapEdit,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: Colors.grey[600], size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.grey[600],
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w500,
                    color: Colors.grey[800],
                  ),
                ),
              ],
            ),
          ),
          if (isEditable && onTapEdit != null)
            IconButton(
              icon: const Icon(Icons.edit, size: 18),
              color: Theme.of(context).primaryColor,
              onPressed: onTapEdit,
              tooltip: 'Edit phone number',
              visualDensity: VisualDensity.compact,
              constraints: const BoxConstraints(),
              padding: const EdgeInsets.all(8),
            ),
        ],
      ),
    );
  }
  
  // Show about dialog
  void _showAboutDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AboutDialog(
        applicationName: 'EcoLafaek',
        applicationVersion: 'Version 1.0.0',
        applicationIcon: Image.asset(
          'assets/images/app_logo.png',
          width: 40,
          height: 40,
        ),
        applicationLegalese: '© 2025 EcoLafaek Team',
        children: [
          const SizedBox(height: 16),
          const Text(
            'EcoLafaek is an app dedicated to waste management and environmental conservation in Timor-Leste. Report waste issues, track cleanup progress, and be part of the solution for a cleaner, more beautiful Timor-Leste.',
            style: TextStyle(
              fontSize: 14,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              IconButton(
                icon: const Icon(Icons.email),
                onPressed: () {
                  launchUrl(Uri.parse('mailto:info@ecolafaek.tl'));
                },
                tooltip: 'Email',
              ),
              IconButton(
                icon: const Icon(Icons.language),
                onPressed: () {
                  launchUrl(Uri.parse('https://ecolafaek.tl'));
                },
                tooltip: 'Website',
              ),
              IconButton(
                icon: const Icon(Icons.facebook),
                onPressed: () {
                  launchUrl(Uri.parse('https://facebook.com/ecolafaek'));
                },
                tooltip: 'Facebook',
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// Extension method to capitalize first letter
extension StringExtension on String {
  String capitalize() {
    if (isEmpty) return this;
    return '${this[0].toUpperCase()}${substring(1)}';
  }
}